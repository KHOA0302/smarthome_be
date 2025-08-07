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
  ProductImage,
  AttributeGroup,
  ProductAttribute,
  ProductSpecification,
  OrderItem,
  Order,
  Sequelize,
  sequelize,
} = db;

const createProductWithDetails = async (req, res) => {
  const { basic, options, variants, services, attributes } = req.body;

  let transaction;

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
    const optionValueMap = new Map();
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
    const variantIdMap = new Map();
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
      const specificationsToCreate = [];

      for (const groupData of attributes) {
        const existingGroup = await AttributeGroup.findByPk(
          groupData.group_id,
          { transaction }
        );
        if (!existingGroup) {
          throw new Error(
            `Nhóm thuộc tính với ID ${groupData.group_id} không tồn tại.`
          );
        }

        if (groupData.attributes && Array.isArray(groupData.attributes)) {
          for (const attrData of groupData.attributes) {
            if (attrData.isRemove) continue;

            const existingProductAttribute = await ProductAttribute.findByPk(
              attrData.attribute_id,
              { transaction }
            );
            if (!existingProductAttribute) {
              throw new Error(
                `Thuộc tính sản phẩm với ID ${attrData.attribute_id} không tồn tại.`
              );
            }

            if (
              attrData.specifications &&
              Array.isArray(attrData.specifications)
            ) {
              for (const specData of attrData.specifications) {
                if (
                  specData.attributeValue &&
                  specData.attributeValue.trim() !== ""
                ) {
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

const getProductVariantDetails = async (req, res) => {
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

    const servicePackages = selectedVariant.servicePackages.sort(
      (a, b) => (a.display_order || Infinity) - (b.display_order || Infinity)
    );
    let lowestDisplayOrderPackageId = null;
    if (servicePackages.length > 0) {
      lowestDisplayOrderPackageId = servicePackages[0].package_id;
    }

    const formattedServicePackages = servicePackages.map((pkg) => {
      return {
        packageId: pkg.package_id,
        packageName: pkg.package_name,

        displayOrder: pkg.display_order,
        selected: pkg.package_id === lowestDisplayOrderPackageId,
        items: pkg.packageItems.map((item) => ({
          itemId: item.package_service_item_id,
          serviceId: item.serviceDefinition.service_id,
          itemName: item.serviceDefinition.service_name,
          itemPriceImpact: parseFloat(item.item_price_impact),
          atLeastOne: item.at_least_one,
          selectable: item.selectable,
          description: item.serviceDefinition.description,
          selected: true,
        })),
      };
    });

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
      servicePackages: formattedServicePackages,
      groupAttributes: groupAttributes,
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const getProductDetails = async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required." });
  }

  try {
    // --- BƯỚC 1: LẤY DANH SÁCH VARIANTS ĐANG CÓ TRONG ĐƠN HÀNG CHƯA HOÀN TẤT ---
    const existingOrderVariantIds = await OrderItem.findAll({
      attributes: [
        [Sequelize.fn("DISTINCT", Sequelize.col("variant_id")), "variant_id"],
      ],
      include: [
        {
          model: Order,
          as: "order",
          attributes: [],
          where: {
            order_status: {
              [Sequelize.Op.notIn]: ["completed", "shipping"],
            },
          },
        },
      ],
      raw: true,
    });

    const variantIdsInActiveOrders = new Set(
      existingOrderVariantIds.map((item) => item.variant_id)
    );

    // --- BƯỚC 2: TRUY VẤN THÔNG TIN SẢN PHẨM NHƯ BÌNH THƯỜNG ---
    const productData = await Product.findOne({
      where: { product_id: productId },
      include: [
        {
          model: ProductImage,
          as: "product_images",
          attributes: ["img_id", "image_url", "display_order"],
        },
        {
          model: ProductVariant,
          as: "variants",
          attributes: { exclude: ["created_at", "updated_at"] },
          include: [
            {
              model: ServicePackage,
              as: "servicePackages",
              attributes: ["package_id", "package_name", "description"],
              include: [
                {
                  model: PackageServiceItem,
                  as: "packageItems",
                  attributes: [
                    "package_service_item_id",
                    "item_price_impact",
                    "selectable",
                    "at_least_one",
                  ],
                  include: [
                    {
                      model: Service,
                      as: "serviceDefinition",
                      attributes: ["service_id", "service_name", "description"],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          model: ProductSpecification,
          as: "specifications",
          attributes: ["specification_id", "attribute_value", "attribute_id"], // Đã thêm "attribute_id"
        },
      ],
      attributes: { exclude: ["created_at", "updated_at"] },
    });

    if (!productData) {
      return res.status(404).json({ message: "Product not found." });
    }

    const product = productData.toJSON();

    // Tách mảng product_images ra khỏi đối tượng product
    const productImgs = product.product_images;
    delete product.product_images;

    const variants = [];
    const servicePackages = [];

    // --- BƯỚC 3: XỬ LÝ VÀ TÁI CẤU TRÚC DỮ LIỆU ---
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((variant) => {
        const {
          servicePackages: currentServicePackages,
          ...variantWithoutPackages
        } = variant;

        variantWithoutPackages.exist_in_order = variantIdsInActiveOrders.has(
          variant.variant_id
        );
        variants.push(variantWithoutPackages);

        // Lặp qua tất cả gói dịch vụ của biến thể hiện tại và thêm vào mảng chung
        currentServicePackages.forEach((pkg) => {
          const mappedItems = pkg.packageItems.map((item) => ({
            itemId: item.package_service_item_id,
            itemName: item.serviceDefinition.service_name,
            itemPriceImpact: item.item_price_impact,
            selectable: item.selectable,
            atLeastOne: item.at_least_one,
            serviceId: item.serviceDefinition.service_id,
          }));

          servicePackages.push({
            variant_id: variant.variant_id,
            packageId: pkg.package_id,
            packageName: pkg.package_name,
            displayOrder: pkg.display_order,
            items: mappedItems,
          });
        });
      });
    }

    // --- BƯỚC 3: XỬ LÝ THÔNG SỐ KỸ THUẬT THEO LOGIC MỚI ---
    // Truy vấn tất cả AttributeGroup và ProductAttribute của category
    const attributeGroupsData = await AttributeGroup.findAll({
      where: { category_id: product.category_id },
      include: {
        model: ProductAttribute,
        as: "productattributes",
        attributes: [
          "attribute_id",
          "attribute_name",
          "unit",
          "display_order",
          "is_filterable",
        ],
      },
      order: [
        ["display_order", "ASC"],
        [
          { model: ProductAttribute, as: "productattributes" },
          "display_order",
          "ASC",
        ],
      ],
    });

    // Tạo cấu trúc cơ sở groupedSpecifications
    const groupedSpecifications = {};
    attributeGroupsData.forEach((group) => {
      const groupJson = group.toJSON();
      groupedSpecifications[group.group_id] = {
        groupId: groupJson.group_id,
        groupName: groupJson.group_name,
        groupDisplayOrder: groupJson.display_order,
        attributes: {},
      };

      groupJson.productattributes.forEach((attr) => {
        groupedSpecifications[group.group_id].attributes[attr.attribute_id] = {
          attributeId: attr.attribute_id,
          attributeName: attr.attribute_name,
          displayOrder: attr.display_order,
          isFilterable: attr.is_filterable,
          unit: attr.unit,
          attributeValues: [], // Luôn tồn tại, ban đầu là mảng rỗng
        };
      });
    });

    // Điền giá trị từ product.specifications (nếu có)
    if (product.specifications && product.specifications.length > 0) {
      product.specifications.forEach((spec) => {
        // Tìm thuộc tính tương ứng và thêm giá trị
        // Sử dụng try-catch để phòng trường hợp dữ liệu không khớp
        try {
          const attribute = Object.values(groupedSpecifications)
            .flatMap((group) => Object.values(group.attributes))
            .find((attr) => attr.attributeId === spec.attribute_id);

          if (attribute) {
            attribute.attributeValues.push({
              attributeValueId: spec.specification_id,
              attributeValueName: spec.attribute_value,
            });
          }
        } catch (error) {
          console.warn(
            `Could not map specification with attribute_id: ${spec.attribute_id}`
          );
        }
      });
    }

    // Chuyển đối tượng thành mảng và sắp xếp để trả về frontend
    const finalSpecifications = Object.values(groupedSpecifications).map(
      (group) => {
        group.attributes = Object.values(group.attributes);
        return group;
      }
    );

    delete product.variants;
    delete product.specifications;

    const response = {
      productInfo: product,
      variants: variants,
      servicePackages: servicePackages,
      attributeGroups: finalSpecifications,
      productImgs: productImgs,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching product details:", error);
    return res.status(500).json({
      message: "An error occurred while retrieving product details.",
      error: error.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll();

    if (products.length > 0) {
      return res.status(200).json(products);
    } else {
      return res.status(404).json({ message: "No products found." });
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      message: "An error occurred while retrieving products.",
      error: error.message,
    });
  }
};

const editProductImgs = async (req, res) => {
  const { productId, productImgs } = req.body;

  if (!productId || !productImgs || !Array.isArray(productImgs)) {
    return res.status(400).json({
      message:
        "Invalid input. 'productId' and an array of 'productImgs' are required.",
    });
  }

  const t = await ProductImage.sequelize.transaction();
  try {
    const createPromises = [];
    const updatePromises = [];
    const deletePromises = [];

    for (const img of productImgs) {
      if (typeof img.img_id === "string" && img.image_url) {
        createPromises.push(
          ProductImage.create(
            {
              product_id: productId,
              image_url: img.image_url,
              display_order: img.display_order,
              created_at: new Date(),
              updated_at: new Date(),
            },
            { transaction: t }
          )
        );
      } else if (typeof img.img_id === "number" && img.isRemove) {
        deletePromises.push(
          ProductImage.destroy({
            where: {
              img_id: img.img_id,
              product_id: productId,
            },
            transaction: t,
          })
        );
      } else if (typeof img.img_id === "number" && !img.isRemove) {
        updatePromises.push(
          ProductImage.update(
            {
              image_url: img.image_url,
              display_order: img.display_order,
            },
            {
              where: {
                img_id: img.img_id,
                product_id: productId,
              },
              transaction: t,
            }
          )
        );
      }
    }

    await Promise.all([
      ...createPromises,
      ...updatePromises,
      ...deletePromises,
    ]);

    await t.commit();

    return res.status(200).json({
      message: "Product images updated successfully.",
      productId: productId,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error updating product images:", error);
    return res.status(500).json({
      message: "An error occurred while updating product images.",
      error: error.message,
    });
  }
};

const editVariants = async (req, res) => {
  const { productId, variants } = req.body;

  if (!productId || !variants || !Array.isArray(variants)) {
    return res.status(400).json({
      message:
        "Invalid input. 'productId' and an array of 'variants' are required.",
    });
  }

  // Sử dụng transaction để đảm bảo tính toàn vẹn của dữ liệu
  const t = await sequelize.transaction();
  try {
    const updatePromises = [];
    const deletePromises = [];

    for (const variant of variants) {
      // Trường hợp 1: isRemove = true -> Xóa biến thể
      if (variant.isRemove) {
        if (typeof variant.variant_id === "number") {
          deletePromises.push(
            ProductVariant.destroy({
              where: {
                variant_id: variant.variant_id,
                product_id: productId, // Đảm bảo chỉ xóa biến thể của sản phẩm này
              },
              transaction: t,
            })
          );
        }
      }
      // Trường hợp 2: isRemove = false -> Cập nhật biến thể
      else {
        if (typeof variant.variant_id === "number") {
          const cleanedPrice = parseFloat(
            String(variant.price).replace(/\./g, "")
          );
          updatePromises.push(
            ProductVariant.update(
              {
                variant_name: variant.variant_name,
                variant_sku: variant.variant_sku,
                price: cleanedPrice,
                stock_quantity: variant.stock_quantity,
                image_url: variant.image_url,
                item_status: variant.item_status,
              },
              {
                where: {
                  variant_id: variant.variant_id,
                  product_id: productId,
                },
                transaction: t,
              }
            )
          );
        }
      }
    }

    // Thực hiện tất cả các promises xóa và cập nhật đồng thời
    await Promise.all([...updatePromises, ...deletePromises]);

    // Commit transaction nếu mọi thứ đều thành công
    await t.commit();

    return res.status(200).json({
      message: "Product variants updated successfully.",
      productId: productId,
    });
  } catch (error) {
    // Rollback transaction nếu có lỗi xảy ra
    await t.rollback();
    console.error("Error editing product variants:", error);
    return res.status(500).json({
      message: "An error occurred while updating product variants.",
      error: error.message,
    });
  }
};

const editService = async (req, res) => {
  const { servicePackages } = req.body;

  if (!servicePackages || !Array.isArray(servicePackages)) {
    return res.status(400).json({ message: "Dữ liệu không hợp lệ." });
  }

  try {
    await sequelize.transaction(async (t) => {
      // --- GIAI ĐOẠN 1: XỬ LÝ CÁC GÓI DỊCH VỤ ĐÃ TỒN TẠI (CẬP NHẬT & XÓA) ---
      for (const pkg of servicePackages) {
        if (typeof pkg.packageId === "number") {
          if (pkg.isRemove) {
            // Xóa tất cả dịch vụ con trước
            await PackageServiceItem.destroy({
              where: { package_id: pkg.packageId },
              transaction: t,
            });
            // Sau đó, xóa gói dịch vụ
            await ServicePackage.destroy({
              where: { package_id: pkg.packageId },
              transaction: t,
            });
          } else {
            // Cập nhật thông tin gói dịch vụ
            await ServicePackage.update(
              {
                package_name: pkg.packageName,
                description: pkg.description,
                display_order: pkg.displayOrder,
              },
              {
                where: { package_id: pkg.packageId },
                transaction: t,
              }
            );

            // Xử lý các dịch vụ con bên trong
            for (const item of pkg.items) {
              const cleanedPrice = parseFloat(
                String(item.itemPriceImpact).replace(/\./g, "")
              );
              if (typeof item.itemId === "number") {
                if (item.isRemove) {
                  // Xóa dịch vụ con cụ thể
                  await PackageServiceItem.destroy({
                    where: { package_service_item_id: item.itemId },
                    transaction: t,
                  });
                } else {
                  // Cập nhật thông tin dịch vụ con
                  await PackageServiceItem.update(
                    {
                      item_price_impact: cleanedPrice,
                      selectable: item.selectable,
                      at_least_one: item.atLeastOne,
                    },
                    {
                      where: { package_service_item_id: item.itemId },
                      transaction: t,
                    }
                  );
                }
              }
            }
          }
        }
      }

      // --- GIAI ĐOẠN 2: XỬ LÝ CÁC GÓI DỊCH VỤ VÀ DỊCH VỤ CON MỚI (TẠO MỚI) ---
      for (const pkg of servicePackages) {
        if (typeof pkg.packageId === "string") {
          if (!pkg.isRemove) {
            const newPackage = await ServicePackage.create(
              {
                variant_id: pkg.variant_id,
                package_name: pkg.packageName,
                description: pkg.description,
                display_order: pkg.displayOrder,
              },
              { transaction: t }
            );

            for (const item of pkg.items) {
              const cleanedPrice = parseFloat(
                String(item.itemPriceImpact).replace(/\./g, "")
              );
              if (!item.isRemove) {
                await PackageServiceItem.create(
                  {
                    package_id: newPackage.package_id,
                    service_id: item.serviceId,
                    item_price_impact: cleanedPrice,
                    at_least_one: item.atLeastOne,
                    selectable: item.selectable,
                  },
                  { transaction: t }
                );
              }
            }
          }
        } else if (typeof pkg.packageId === "number" && !pkg.isRemove) {
          // Xử lý các dịch vụ con mới cho gói dịch vụ đã tồn tại
          for (const item of pkg.items) {
            if (typeof item.itemId === "string") {
              if (!item.isRemove) {
                await PackageServiceItem.create(
                  {
                    package_id: pkg.packageId,
                    service_id: item.serviceId,
                    item_price_impact: item.itemPriceImpact,
                    at_least_one: item.atLeastOne,
                    selectable: item.selectable,
                  },
                  { transaction: t }
                );
              }
            }
          }
        }
      }
    });

    return res.status(200).json({ message: "Cập nhật dịch vụ thành công." });
  } catch (error) {
    console.error("Lỗi khi cập nhật dịch vụ:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi cập nhật dịch vụ.",
      error: error.message,
    });
  }
};

const editSpecifications = async (req, res) => {
  const { productId, attributeGroups } = req.body;

  if (!productId || !attributeGroups) {
    return res
      .status(400)
      .json({ message: "Product ID and attribute groups are required." });
  }

  try {
    await sequelize.transaction(async (t) => {
      // Lặp qua từng nhóm thuộc tính (AttributeGroup)
      for (const group of attributeGroups) {
        // Lặp qua từng thuộc tính con (ProductAttribute)
        for (const attribute of group.attributes) {
          // Lặp qua từng giá trị thuộc tính (ProductSpecification)
          for (const value of attribute.attributeValues) {
            // Trường hợp 1: Xóa một thông số kỹ thuật đã tồn tại
            if (value.isRemove) {
              if (typeof value.attributeValueId === "number") {
                await ProductSpecification.destroy({
                  where: { specification_id: value.attributeValueId },
                  transaction: t,
                });
              }
              // Nếu là chuỗi (bản ghi mới), chỉ cần bỏ qua
            }
            // Trường hợp 2: Cập nhật hoặc thêm mới thông số kỹ thuật
            else {
              // Cập nhật thông số kỹ thuật đã tồn tại
              if (typeof value.attributeValueId === "number") {
                await ProductSpecification.update(
                  {
                    attribute_value: value.attributeValueName,
                  },
                  {
                    where: {
                      specification_id: value.attributeValueId,
                    },
                    transaction: t,
                  }
                );
              }
              // Thêm mới thông số kỹ thuật
              else if (
                typeof value.attributeValueId === "string" &&
                value.attributeValueName.trim() !== ""
              ) {
                await ProductSpecification.create(
                  {
                    product_id: productId,
                    attribute_id: attribute.attributeId,
                    attribute_value: value.attributeValueName,
                  },
                  { transaction: t }
                );
              }
            }
          }
        }
      }
    });

    return res
      .status(200)
      .json({ message: "Product specifications updated successfully." });
  } catch (error) {
    console.error("Error updating specifications:", error);
    return res.status(500).json({
      message: "An error occurred while updating product specifications.",
      error: error.message,
    });
  }
};

const getTopSaleVariants = async (req, res) => {
  const { limit } = req.params;

  try {
    const topVariants = await ProductVariant.findAll({
      attributes: [
        "variant_id",
        "variant_sku",
        "variant_name",
        "price",
        "stock_quantity",
        "image_url",
      ],

      include: [
        {
          model: Product,
          as: "product",
          attributes: ["product_id", "sale_volume"],
        },
      ],
      order: [[{ model: Product, as: "product" }, "sale_volume", "DESC"]],

      limit: parseInt(limit, 10),
    });

    res.status(200).json(topVariants);
  } catch (error) {
    console.error("Lỗi khi lấy các variant bán chạy:", error);
    res.status(500).json({ error: "Đã xảy ra lỗi khi lấy dữ liệu." });
  }
};

const getLatestProducts = async (req, res) => {
  const { limit } = req.params;

  try {
    // Bước 1: Tìm 5 Product mới nhất dựa trên created_at
    const latestProducts = await Product.findAll({
      attributes: ["product_id", "sale_volume", "created_at"],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit, 10),
      raw: true, // Lấy kết quả dưới dạng JSON thuần
    });

    // Bước 2: Với mỗi Product mới nhất, tìm Variant mới nhất của nó
    const latestVariantsPromises = latestProducts.map(async (product) => {
      const latestVariant = await ProductVariant.findOne({
        where: { product_id: product.product_id },
        attributes: [
          "variant_id",
          "variant_sku",
          "variant_name",
          "price",
          "stock_quantity",
          "image_url",
          "created_at",
        ],
        order: [["created_at", "DESC"]],
        raw: true, // Lấy kết quả dưới dạng JSON thuần
      });

      if (latestVariant) {
        // Bước 3: Tạo đối tượng theo cấu trúc bạn mong muốn
        return {
          ...latestVariant,
          product: {
            product_id: product.product_id,
            sale_volume: product.sale_volume,
            created_at: product.created_at,
          },
        };
      }
      return null;
    });

    const results = await Promise.all(latestVariantsPromises);

    // Lọc bỏ các giá trị null nếu có sản phẩm không có biến thể
    const finalResult = results.filter((item) => item !== null);

    res.status(200).json(finalResult);
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm và biến thể mới nhất:", error);
    res.status(500).json({ error: "Đã xảy ra lỗi khi lấy dữ liệu." });
  }
};

module.exports = {
  createProductWithDetails,
  getProductVariantDetails,
  getProductDetails,
  getAllProducts,
  editProductImgs,
  editVariants,
  editService,
  editSpecifications,
  getTopSaleVariants,
  getLatestProducts,
};
