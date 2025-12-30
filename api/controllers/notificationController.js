const db = require("../models");
const { getOrder } = require("../services/notificationService/getOrder");
const redisClient = require("../../api/config/redis.config");
const {
  getProductVariant,
} = require("../services/notificationService/getProductVariant");
const SOCKET_CHANNEL = "SOCKET_BROADCAST_CHANNEL";

const { productVariant, Notification, Order, OrderItem, sequelize, Sequelize } =
  db;

const getNotification = async (req, res) => {
  let identifier;

  if (req.isGuest) {
    identifier = { session_id: req.sessionId };
  } else {
    identifier = {
      user_id: req.user.id,
      role_id: parseInt(req.user.role_id),
    };
  }

  try {
    const [variantsData, ordersData] = await Promise.all([
      getProductVariant(),
      getOrder(null, identifier),
    ]);

    return res.status(200).json({
      message: "Tải danh sách thông báo thành công",
      data: {
        variantsData: identifier?.role_id === 1 ? variantsData : [],
        ordersData: ordersData,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Không thế lấy thông báo." });
  }
};

const deleteNotification = async (req, res) => {
  const { notificationId } = req.params;

  let identifier;

  if (req.isGuest) {
    identifier = { session_id: req.sessionId };
  } else {
    identifier = {
      user_id: req.user.id,
      role_id: parseInt(req.user.role_id),
    };
  }

  try {
    const notification = await Notification.findByPk(notificationId);

    const orderId = notification.order_id;
    const variantId = notification.variant_id;

    if (!notification) {
      return res.status(404).json({
        message: "Không tìm thấy thông báo để xóa",
      });
    }

    let updateData = {};

    if (orderId) {
      updateData =
        identifier?.role_id === 1
          ? { show_admin: false }
          : { show_user: false };
    }

    if (variantId) {
      updateData = { show_admin: false, show_user: false };
    }

    await notification.update(updateData);

    if (!notification.show_admin && !notification.show_user) {
      await notification.destroy();
    }

    if (redisClient) {
      if (variantId) {
        const socketMessage = {
          type: "DELETE_INVENTORY_ALERT",
          id: parseInt(notificationId),
          role_id: identifier.role_id,
        };
        await redisClient.publish(
          SOCKET_CHANNEL,
          JSON.stringify(socketMessage)
        );
      } else if (orderId) {
        const socketMessage = {
          type: "DELETE_ORDER_ALERT",
          id: parseInt(notificationId),
          user_id: identifier?.user_id || null,
          role_id: identifier?.role_id || null,
          session_id: identifier?.session_id || null,
        };
        await redisClient.publish(
          SOCKET_CHANNEL,
          JSON.stringify(socketMessage)
        );
      }
    }

    return res.status(200).json({
      message: "Xóa thông báo thành công",
      id: notificationId,
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ khi xóa thông báo",
    });
  }
};

module.exports = {
  getNotification,
  deleteNotification,
};
