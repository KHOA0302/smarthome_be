const db = require("../models");
const {
  getProductVariant,
} = require("../services/notificationService/getProductVariant");
const { productVariant, Notification, Order, OrderItem, sequelize, Sequelize } =
  db;

const getNotification = async (req, res) => {
  try {
    const variantsData = await getProductVariant();
    return res.status(200).json({
      message: "Tải danh sách thông báo thành công",
      data: {
        variantsData: variantsData,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Không thế lấy thông báo." });
  }
};

const redisClient = require("../../api/config/redis.config");
const SOCKET_CHANNEL = "SOCKET_BROADCAST_CHANNEL";

const deleteNotification = async (req, res) => {
  const { notificationId } = req.params;

  try {
    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return res.status(404).json({
        message: "Không tìm thấy thông báo để xóa",
      });
    }

    await Notification.destroy({
      where: { id: notificationId },
    });

    if (redisClient) {
      const socketMessage = {
        type: "DELETE_INVENTORY_ALERT",
        id: parseInt(notificationId),
      };
      await redisClient.publish(SOCKET_CHANNEL, JSON.stringify(socketMessage));
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
