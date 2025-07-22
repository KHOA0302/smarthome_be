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
  AttributeGroup, // <--- THÊM vào đây
  ProductAttribute, // <--- THÊM vào đây
  ProductSpecification, // <--- THÊM vào đây
} = db;

const { Op } = require("sequelize");

const createProductWithDetails = async (req, res) => {
  const { basic, options, variants, services, attributes } = req.body; // Dữ liệu từ frontend

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
        display_order: (index + 1) * 100000, // Gán display_order dựa trên vị trí trong mảng
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

    // --- BƯỚC 7: XỬ LÝ PRODUCTATTRIBUTES VÀ PRODUCTSPECIFICATIONS (Tối ưu hóa việc thêm mới) ---
    if (attributes && Array.isArray(attributes) && attributes.length > 0) {
      // Mảng để lưu trữ TẤT CẢ các bản ghi ProductSpecification cần tạo
      const specificationsToCreate = [];

      for (const groupData of attributes) {
        // Kiểm tra xem AttributeGroup có tồn tại không
        const existingGroup = await AttributeGroup.findByPk(
          groupData.group_id,
          { transaction }
        );
        if (!existingGroup) {
          throw new Error(
            `Nhóm thuộc tính với ID ${groupData.group_id} không tồn tại.`
          );
        }

        // Xử lý các ProductAttribute trong mỗi nhóm
        if (groupData.attributes && Array.isArray(groupData.attributes)) {
          for (const attrData of groupData.attributes) {
            // Nếu thuộc tính bị xóa, bỏ qua (trong ngữ cảnh tạo mới thì có thể bỏ qua dòng này)
            if (attrData.isRemove) continue;

            // Kiểm tra xem ProductAttribute có tồn tại không
            const existingProductAttribute = await ProductAttribute.findByPk(
              attrData.attribute_id,
              { transaction }
            );
            if (!existingProductAttribute) {
              throw new Error(
                `Thuộc tính sản phẩm với ID ${attrData.attribute_id} không tồn tại.`
              );
            }

            // Xử lý ProductSpecification cho từng ProductAttribute
            if (
              attrData.specifications &&
              Array.isArray(attrData.specifications)
            ) {
              for (const specData of attrData.specifications) {
                // Đảm bảo có attributeValue và không rỗng
                if (
                  specData.attributeValue &&
                  specData.attributeValue.trim() !== ""
                ) {
                  // Thêm bản ghi vào mảng thay vì tạo ngay lập tức
                  specificationsToCreate.push({
                    product_id: productId,
                    attribute_id: specData.attributeId,
                    attribute_value: specData.attributeValue.trim(),
                  });
                }
              }
            }
          }
        }
      }

      // Thực hiện BULK INSERT (tạo hàng loạt) một lần sau khi thu thập tất cả các bản ghi
      if (specificationsToCreate.length > 0) {
        await ProductSpecification.bulkCreate(specificationsToCreate, {
          transaction,
        });
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

const getProductDetails = async (req, res) => {
  const { product_id, variant_id } = req.params;

  try {
    const productDetails = await db.Product.findByPk(product_id, {
      attributes: ["product_id", "product_name"],
      include: [
        {
          model: db.ProductVariant,
          as: "variants",
          attributes: [
            "variant_id",
            "variant_sku",
            "variant_name",
            "price",
            "stock_quantity",
            "image_url",
            "item_status",
          ],
          include: [
            {
              model: db.OptionValue,
              as: "selectedOptionValues",
              through: { attributes: [] },
              include: {
                model: db.Option,
                as: "option",
                attributes: ["option_id", "option_name"],
              },
            },
            {
              model: db.ServicePackage,
              as: "servicePackages",
              // Các thuộc tính này khớp với model ServicePackage bạn cung cấp
              attributes: [
                "package_id",
                "package_name",
                "display_order",
                "description",
              ],
              include: [
                {
                  model: db.PackageServiceItem,
                  as: "packageItems",
                  attributes: [
                    "package_service_item_id",
                    "item_price_impact",
                    "at_least_one",
                    "selectable",
                  ],
                  include: {
                    model: db.Service,
                    as: "serviceDefinition",
                    attributes: ["service_id", "service_name", "description"],
                  },
                },
              ],
            },
          ],
        },
        {
          model: db.ProductSpecification,
          as: "specifications",
          attributes: ["attribute_value"],
          include: {
            model: db.ProductAttribute,
            as: "productAttribute",
            attributes: [
              "attribute_id",
              "attribute_name",
              "display_order",
              "is_filterable",
              "unit",
            ],
            include: {
              model: db.AttributeGroup,
              as: "attributegroups",
              attributes: ["group_id", "group_name", "display_order"],
            },
          },
        },
        {
          model: db.ProductImage,
          as: "product_images",
          attributes: ["img_id", "image_url", "display_order"],
        },
      ],
      order: [
        ["variants", "variant_id", "ASC"],
        [
          "variants",
          { model: db.OptionValue, as: "selectedOptionValues" },
          { model: db.Option, as: "option" },
          "option_id",
          "ASC",
        ],
        [
          "variants",
          { model: db.OptionValue, as: "selectedOptionValues" },
          "option_value_id",
          "ASC",
        ],
        ["product_images", "display_order", "ASC"],
        [
          "specifications",
          { model: db.ProductAttribute, as: "productAttribute" },
          { model: db.AttributeGroup, as: "attributegroups" },
          "display_order",
          "ASC",
        ],
        [
          "specifications",
          { model: db.ProductAttribute, as: "productAttribute" },
          "display_order",
          "ASC",
        ],
      ],
    });

    if (!productDetails) {
      return res.status(404).json({ message: "Product not found." });
    }

    let selectedVariant = null;
    if (variant_id) {
      selectedVariant = productDetails.variants.find(
        (v) => v.variant_id == variant_id
      );
    } else {
      selectedVariant = productDetails.variants[0];
    }

    if (!selectedVariant) {
      return res
        .status(404)
        .json({ message: "Variant not found for this product." });
    }

    // --- Định dạng lại dữ liệu để gửi về frontend ---

    // a. Định dạng `allOptions` (giữ nguyên)
    const allOptions = [];
    const optionMap = new Map();

    productDetails.variants.forEach((variant) => {
      variant.selectedOptionValues.forEach((ov) => {
        if (!optionMap.has(ov.option.option_id)) {
          optionMap.set(ov.option.option_id, {
            optionId: ov.option.option_id,
            optionName: ov.option.option_name,
            optionValues: [],
          });
        }
        const existingOptionValues = optionMap.get(
          ov.option.option_id
        ).optionValues;
        if (
          !existingOptionValues.some(
            (val) => val.valueId === ov.option_value_id
          )
        ) {
          existingOptionValues.push({
            valueId: ov.option_value_id,
            valueName: ov.option_value_name,
            selected: false,
          });
        }
      });
    });

    optionMap.forEach((option) => {
      option.optionValues.sort((a, b) => a.valueId - b.valueId);
      allOptions.push(option);
    });
    allOptions.sort((a, b) => a.optionId - b.optionId);

    if (selectedVariant) {
      allOptions.forEach((option) => {
        option.optionValues.forEach((value) => {
          if (
            selectedVariant.selectedOptionValues.some(
              (sov) => sov.option_value_id === value.valueId
            )
          ) {
            value.selected = true;
          }
        });
      });
    }

    // b. Định dạng `servicePackages`
    const servicePackages = selectedVariant.servicePackages.sort(
      (a, b) => (a.display_order || Infinity) - (b.display_order || Infinity)
    ); // Sắp xếp các gói dịch vụ theo display_order

    let lowestDisplayOrderPackageId = null;
    if (servicePackages.length > 0) {
      lowestDisplayOrderPackageId = servicePackages[0].package_id;
    }

    const formattedServicePackages = servicePackages.map((pkg) => {
      return {
        packageId: pkg.package_id,
        packageName: pkg.package_name,
        price: pkg.packageItems.reduce(
          (sum, item) => sum + parseFloat(item.item_price_impact),
          0
        ),
        displayOrder: pkg.display_order,
        isDefault: pkg.is_default,
        description: pkg.description,
        // Gói có display_order thấp nhất sẽ có selected: true
        selected: pkg.package_id === lowestDisplayOrderPackageId,
        items: pkg.packageItems.map((item) => ({
          itemId: item.serviceDefinition.service_id,
          itemName: item.serviceDefinition.service_name,
          itemPriceImpact: parseFloat(item.item_price_impact),
          atLeastOne: item.at_least_one,
          selectable: item.selectable,
          description: item.serviceDefinition.description,
          selected: true, // Mặc định tất cả item trong gói là true
        })),
      };
    });

    // c. Định dạng `groupAttributes` với cấu trúc model mới (giữ nguyên)
    const groupAttributesMap = new Map();

    productDetails.specifications.forEach((spec) => {
      const attribute = spec.productAttribute;
      const attributeGroup = attribute.attributegroups;

      if (!attributeGroup) {
        console.warn(
          `ProductAttribute with ID ${attribute.attribute_id} has no associated AttributeGroup.`
        );
        return;
      }

      const groupName = attributeGroup.group_name;
      const groupDisplayOrder = attributeGroup.display_order;
      const groupId = attributeGroup.group_id;

      if (!groupAttributesMap.has(groupId)) {
        groupAttributesMap.set(groupId, {
          groupId: groupId,
          groupName: groupName,
          groupDisplayOrder: groupDisplayOrder,
          attributes: new Map(),
        });
      }

      const currentGroup = groupAttributesMap.get(groupId);
      if (!currentGroup.attributes.has(attribute.attribute_id)) {
        currentGroup.attributes.set(attribute.attribute_id, {
          attributeId: attribute.attribute_id,
          attributeName: attribute.attribute_name,
          displayOrder: attribute.display_order,
          isFilterable: attribute.is_filterable,
          unit: attribute.unit,
          attributeValues: [],
        });
      }
      currentGroup.attributes
        .get(attribute.attribute_id)
        .attributeValues.push(spec.attribute_value);
    });

    const groupAttributes = Array.from(groupAttributesMap.values())
      .map((group) => {
        const attributesArray = Array.from(group.attributes.values()).sort(
          (a, b) => (a.displayOrder || 999) - (b.displayOrder || 999)
        );

        attributesArray.forEach((attr) => {
          attr.attributeValues = Array.from(
            new Set(attr.attributeValues)
          ).sort();
        });

        return {
          groupId: group.groupId,
          groupName: group.groupName,
          groupDisplayOrder: group.groupDisplayOrder,
          attributes: attributesArray,
        };
      })
      .sort(
        (a, b) => (a.groupDisplayOrder || 999) - (b.groupDisplayOrder || 999)
      );

    // d. Định dạng `variants` (danh sách tất cả variants của sản phẩm gốc) (giữ nguyên)
    const allVariants = productDetails.variants.map((v) => ({
      variantId: v.variant_id,
      variantSku: v.variant_sku,
      variantName: v.variant_name,
      price: parseFloat(v.price),
      stockQuantity: v.stock_quantity,
      imageUrl: v.image_url,
      itemStatus: v.item_status,
      optionValueIds: v.selectedOptionValues
        .map((ov) => ov.option_value_id)
        .sort(),
    }));

    // --- 5. Trả về phản hồi ---
    res.status(200).json({
      base: {
        productId: productDetails.product_id,
        productName: productDetails.product_name,
        productImages: productDetails.product_images.map((img) => ({
          imgId: img.img_id,
          imageUrl: img.image_url,
          displayOrder: img.display_order,
        })),
      },
      selectedVariant: {
        variantId: selectedVariant.variant_id,
        variantSku: selectedVariant.variant_sku,
        variantName: selectedVariant.variant_name,
        price: parseFloat(selectedVariant.price),
        stockQuantity: selectedVariant.stock_quantity,
        imageUrl: selectedVariant.image_url,
        itemStatus: selectedVariant.item_status,
        optionValueIds: selectedVariant.selectedOptionValues
          .map((ov) => ov.option_value_id)
          .sort(),
      },
      allOptions: allOptions,
      variants: allVariants,
      servicePackages: formattedServicePackages, // Sử dụng biến mới đã định dạng
      groupAttributes: groupAttributes,
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports = {
  createProductWithDetails,
  getProductDetails,
};
