const db = require("../../models/index");
const { Product, ProductVariant, Option, OptionValue, Brand, Category } = db;
const { Op } = require("sequelize");

async function getPredictedProductDetails(variantIds, predictionData, filter) {
  const { brand, category, status } = filter;

  const variantWhere = {
    variant_id: variantIds,
  };

  if (status) {
    variantWhere.item_status = status;
  }

  const productWhere = {};

  if (brand) {
    productWhere.brand_id = parseInt(brand);
  }

  if (category) {
    productWhere.category_id = parseInt(category);
  }

  const variants = await ProductVariant.findAll({
    where: variantWhere,
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["product_id", "product_name"],
        where: Object.keys(productWhere).length > 0 ? productWhere : null,
        required: Object.keys(productWhere).length > 0,
        include: [
          { model: Brand, as: "brand", attributes: ["brand_name", "logo_url"] },
          {
            model: Category,
            as: "category",
            attributes: ["category_name", "icon_url"],
          },
        ],
      },

      {
        model: OptionValue,
        as: "selectedOptionValues",
        attributes: ["option_value_id", "option_value_name"],
        through: { attributes: [] },
        include: [{ model: Option, as: "option", attributes: ["option_name"] }],
      },
    ],
  });

  const finalResult = variants.map((variant) => {
    const prediction = predictionData.find(
      (p) => p.variant_id === variant.variant_id
    );
    const variantData = variant.get({ plain: true });

    return {
      ...variantData,

      stemp: prediction ? prediction.stemp : 0,
    };
  });

  return finalResult;
}

module.exports = getPredictedProductDetails;
