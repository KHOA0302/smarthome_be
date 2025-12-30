const db = require("../../models/index");
const {
  Notification,
  ProductVariant,
  Product,
  Order,
  OrderItem,
  Promotion,
  User,
} = db;

const getProductVariant = async (notificationId = null) => {
  try {
    return await Notification.findAll({
      order: [["created_at", "DESC"]],
      where: notificationId
        ? { id: notificationId, type: "NEW_INVENTORY_ALERT" }
        : { type: "NEW_INVENTORY_ALERT" },
      include: [
        {
          model: ProductVariant,
          as: "variant",
          attributes: [
            "variant_id",
            "variant_name",
            "image_url",
            "product_id",
            "stock_quantity",
            "price",
          ],
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["product_name"],
            },
            {
              model: Promotion,
              as: "promotions",
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

module.exports = {
  getProductVariant,
};
