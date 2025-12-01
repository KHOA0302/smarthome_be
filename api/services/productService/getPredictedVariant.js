const db = require("../../models/index");
const { Product, ProductVariant, Option, OptionValue, Brand, Category } = db;

async function getPredictedProductDetails(variantIds, predictionData) {
  const variants = await ProductVariant.findAll({
    where: {
      variant_id: variantIds,
    },
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
        model: Product,
        as: "product",
        attributes: ["product_id", "product_name"],
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
