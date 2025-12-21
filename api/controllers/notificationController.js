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

module.exports = {
  getNotification,
};
