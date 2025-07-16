const db = require("../models");
const {
  Product,
  ProductVariant,
  Option,
  OptionValue,
  VariantOptionSelection,
  Service,
  ServicePackage,
  PackageServiceItem,
  Brand,
  Category,
  ProductImage, // <--- THÊM ProductImage vào đây
} = db;

const { Op } = require("sequelize");

const createProductWithDetails = async (req, res) => {
  const { basic, options, variants, services } = req.body; // Dữ liệu từ frontend

  let transaction;

  // --- LOGGING ĐỂ DEBUG ---
  console.log("------------------- BẮT ĐẦU TẠO SẢN PHẨM -------------------");
  console.log(
    "Dữ liệu nhận được từ req.body:",
    JSON.stringify(req.body, null, 2)
  );
  console.log("Thông tin cơ bản (basic):", basic);
  console.log("Tên sản phẩm (basic.name):", basic ? basic.name : "Không có");
  console.log("----------------------------------------------------------");

  try {
    transaction = await db.sequelize.transaction();

    // --- BƯỚC 1: XÁC THỰC DỮ LIỆU CƠ BẢN VÀ KIỂM TRA KHÓA NGOẠI ---
    if (!basic || !basic.name || basic.name.trim() === "") {
      throw new Error("Tên sản phẩm (basic.name) không được để trống.");
    }
    if (!basic.brand) {
      throw new Error("ID thương hiệu (basic.brand) không được để trống.");
    }
    if (!basic.category) {
      throw new Error("ID danh mục (basic.category) không được để trống.");
    }

    // Kiểm tra sự tồn tại của Brand và Category
    const existingBrand = await Brand.findByPk(basic.brand, { transaction });
    if (!existingBrand) {
      throw new Error(`Thương hiệu với ID ${basic.brand} không tồn tại.`);
    }

    const existingCategory = await Category.findByPk(basic.category, {
      transaction,
    });
    if (!existingCategory) {
      throw new Error(`Danh mục với ID ${basic.category} không tồn tại.`);
    }

    // --- BƯỚC 2: TẠO PRODUCT CHÍNH ---
    const newProduct = await Product.create(
      {
        product_name: basic.name.trim(),
        description: basic.des || null,
        brand_id: basic.brand,
        category_id: basic.category,
      },
      { transaction }
    );

    const productId = newProduct.product_id;

    // --- BƯỚC 3: LƯU TRỮ HÌNH ẢNH VÀO BẢNG ProductImages ---
    if (basic.imgs && Array.isArray(basic.imgs) && basic.imgs.length > 0) {
      const productImagesToCreate = basic.imgs.map((imageUrl, index) => ({
        product_id: productId,
        image_url: imageUrl,
        display_order: index + 1, // Gán display_order dựa trên vị trí trong mảng
      }));

      await ProductImage.bulkCreate(productImagesToCreate, { transaction });
    }

    // --- BƯỚC 4: XỬ LÝ OPTIONS VÀ OPTIONVALUES ---
    const optionValueMap = new Map(); // Map: "value_name" -> option_value_id

    if (options && Array.isArray(options)) {
      for (const optData of options) {
        const existingOption = await Option.findByPk(optData.optionId, {
          transaction,
        });
        if (!existingOption) {
          throw new Error(`Tùy chọn với ID ${optData.optionId} không tồn tại.`);
        }

        if (optData.optionValue && Array.isArray(optData.optionValue)) {
          for (const valueName of optData.optionValue) {
            if (valueName.trim() === "") continue;

            const [optionValue, createdOptionValue] =
              await OptionValue.findOrCreate({
                where: {
                  option_value_name: valueName.trim(),
                  option_id: optData.optionId,
                },
                defaults: {
                  option_id: optData.optionId,
                  option_value_name: valueName.trim(),
                },
                transaction: transaction,
              });
            optionValueMap.set(valueName.trim(), optionValue.option_value_id);
          }
        }
      }
    }

    // --- BƯỚC 5: XỬ LÝ PRODUCTVARIANTS VÀ VARIANTOPTIONSELECTIONS ---
    const variantIdMap = new Map(); // Map: SKU -> variant_id

    if (variants && Array.isArray(variants)) {
      for (const variantData of variants) {
        if (variantData.isRemove) continue;

        if (!variantData.sku || variantData.sku.trim() === "") {
          throw new Error(`SKU biến thể không được để trống.`);
        }
        if (isNaN(parseFloat(String(variantData.price).replace(/\./g, "")))) {
          // Đảm bảo xử lý giá đúng
          throw new Error(
            `Giá biến thể cho SKU '${variantData.sku}' không hợp lệ.`
          );
        }
        if (isNaN(parseInt(variantData.quantity))) {
          throw new Error(
            `Số lượng tồn kho biến thể cho SKU '${variantData.sku}' không hợp lệ.`
          );
        }

        const newVariant = await ProductVariant.create(
          {
            product_id: productId,
            variant_sku: variantData.sku.trim(),
            variant_name: variantData.variantName,
            price: parseFloat(String(variantData.price).replace(/\./g, "")),
            stock_quantity: parseInt(variantData.quantity),
            image_url: variantData.img || null,
            item_status: variantData.itemStatus || "in_stock",
          },
          { transaction }
        );
        variantIdMap.set(variantData.sku.trim(), newVariant.variant_id);

        if (variantData.combination && Array.isArray(variantData.combination)) {
          for (const comboValue of variantData.combination) {
            const optionValueId = optionValueMap.get(comboValue.trim());
            if (optionValueId) {
              await VariantOptionSelection.create(
                {
                  variant_id: newVariant.variant_id,
                  option_value_id: optionValueId,
                },
                { transaction }
              );
            } else {
              throw new Error(
                `Giá trị tùy chọn '${comboValue}' không tìm thấy trong danh sách đã tạo/lấy cho biến thể SKU '${variantData.sku}'.`
              );
            }
          }
        }
      }
    }

    // --- BƯỚC 6: XỬ LÝ SERVICEPACKAGES VÀ PACKAGESERVICEITEMS ---
    if (services && Array.isArray(services)) {
      for (const serviceSkuData of services) {
        if (serviceSkuData.isRemove) continue;

        const variantId = variantIdMap.get(serviceSkuData.SKU.trim());
        if (!variantId) {
          throw new Error(
            `Biến thể với SKU '${serviceSkuData.SKU}' không tìm thấy để liên kết dịch vụ.`
          );
        }

        if (
          serviceSkuData.packageServices &&
          Array.isArray(serviceSkuData.packageServices)
        ) {
          for (const pkgData of serviceSkuData.packageServices) {
            if (!pkgData.packageName || pkgData.packageName.trim() === "") {
              throw new Error(
                `Tên gói dịch vụ không được để trống cho biến thể SKU '${serviceSkuData.SKU}'.`
              );
            }

            const newServicePackage = await ServicePackage.create(
              {
                variant_id: variantId,
                package_name: pkgData.packageName.trim(),
                display_order: pkgData.displayOrder || null,
                description: pkgData.description || null,
              },
              { transaction }
            );

            const packageId = newServicePackage.package_id;

            if (pkgData.packageItem && Array.isArray(pkgData.packageItem)) {
              for (const itemData of pkgData.packageItem) {
                let serviceIdToUse = itemData.serviceId;

                if (
                  !serviceIdToUse &&
                  itemData.serviceName &&
                  itemData.serviceName.trim()
                ) {
                  const serviceDef = await Service.findOne(
                    { where: { service_name: itemData.serviceName.trim() } },
                    { transaction }
                  );
                  if (serviceDef) {
                    serviceIdToUse = serviceDef.service_id;
                  }
                }

                if (!serviceIdToUse) {
                  throw new Error(
                    `ID dịch vụ hoặc Tên dịch vụ không hợp lệ cho mục dịch vụ trong gói '${pkgData.packageName}'.`
                  );
                }

                const existingService = await Service.findByPk(serviceIdToUse, {
                  transaction,
                });
                if (!existingService) {
                  throw new Error(
                    `Dịch vụ với ID ${serviceIdToUse} không tồn tại.`
                  );
                }

                await PackageServiceItem.create(
                  {
                    package_id: packageId,
                    service_id: serviceIdToUse,
                    item_price_impact: parseFloat(
                      String(itemData.price).replace(/\./g, "")
                    ),
                    at_least_one:
                      itemData.atLeastOne !== undefined
                        ? itemData.atLeastOne
                        : false,
                    selectable:
                      itemData.selectable !== undefined
                        ? itemData.selectable
                        : true,
                  },
                  { transaction }
                );
              }
            }
          }
        }
      }
    }

    await transaction.commit();
    res.status(201).json({
      message: "Product and related details created successfully!",
      data: { productId: productId },
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Lỗi khi tạo sản phẩm với chi tiết:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors[0]?.path || "unknown";
      const value = error.errors[0]?.value || "";
      return res.status(409).json({
        message: `Giá trị '${value}' cho trường '${field}' đã tồn tại.`,
        errors: error.errors,
      });
    }
    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((e) => e.message);
      return res
        .status(400)
        .json({ message: "Lỗi xác thực dữ liệu.", errors: messages });
    }

    res.status(500).json({
      message:
        "Có lỗi xảy ra trong quá trình tạo sản phẩm và chi tiết liên quan.",
      error: error.message,
    });
  }
};

module.exports = {
  createProductWithDetails,
};
