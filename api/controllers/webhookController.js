const res = require("express/lib/response");
const { Op } = require("sequelize");
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

async function searchProductByName(name) {
  if (!name || typeof name !== "string") return [];

  const rows = await Product.findAll({
    where: {
      product_name: { [Op.like]: `%${name}%` },
    },
    attributes: ["product_id", "product_name"],
    include: [
      {
        model: ProductVariant,
        as: "variants",
        attributes: ["variant_id", "price"],
        // dùng separate để limit/order áp dụng THEO TỪNG product
        separate: true,
        order: [["price", "ASC"]],
        limit: 1,
      },
    ],
  });

  return rows.map((p) => {
    const json = p.toJSON();
    return {
      product_id: json.product_id,
      product_name: json.product_name,
      price: json.variants?.[0]?.price ?? null,
    };
  });
}

module.exports = {
    searchProductByName,


}