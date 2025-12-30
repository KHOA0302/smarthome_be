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

const getOrder = async (notificationId = null, user = null) => {
  let orderWhere = {};
  let notificationWhere = { type: "NEW_ORDER_ALERT" };

  if (user && user.session_id) {
    orderWhere.session_id = user.session_id;
  }

  if (user && user.user_id) {
    if (user.role_id === 2) {
      orderWhere.user_id = user.user_id;
    }
  }

  if (notificationId) {
    notificationWhere.id = notificationId;
  }

  if (user && user.role_id === 1) {
    notificationWhere.show_admin = true;
  } else {
    notificationWhere.show_user = true;
  }

  try {
    return await Notification.findAll({
      order: [["created_at", "DESC"]],
      where: notificationWhere,
      include: [
        {
          model: Order,
          where: orderWhere,
          as: "order",
          attributes: [
            "order_id",
            "user_id",
            "session_id",
            "order_total",
            "order_status",
            "payment_method",
            "payment_status",
          ],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["email", "full_name", "phone_number", "role_id"],
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
  getOrder,
};
