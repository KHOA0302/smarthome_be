const redisClient = require("../../api/config/redis.config");
const db = require("../../api/models");
const { Notification } = db;
const {
  getProductVariant,
} = require("../../api/services/notificationService/getProductVariant");
const SOCKET_CHANNEL = "SOCKET_BROADCAST_CHANNEL";

async function processAlertEvent(eventDataString) {
  try {
    const savedNotify = await db.Notification.create({
      type: eventDataString.processingType,
      variant_id: eventDataString.variant_id || null,
      order_id: eventDataString.order_id || null,
    });

    const [variantData] = await getProductVariant(savedNotify.id);

    await redisClient.publish(SOCKET_CHANNEL, JSON.stringify(variantData));
  } catch (error) {
    console.error(`[Worker] ERROR Alert PROCCESSING:`, error);
  }
}

async function processDeleteAlertEvent(eventDataString) {
  try {
    const { variant_id, processingType } = eventDataString;

    const notificationsToDelete = await Notification.findAll({
      where: {
        variant_id: variant_id,
        type: "NEW_INVENTORY_ALERT",
      },
      attributes: ["id"],
    });

    if (notificationsToDelete.length === 0) {
      console.log(
        "Không tìm thấy thông báo nào để xóa cho variant:",
        variant_id
      );
      return;
    }

    const idsToBeRemoved = notificationsToDelete.map((n) => n.id);
    await Notification.destroy({
      where: { id: idsToBeRemoved },
    });

    await redisClient.publish(
      SOCKET_CHANNEL,
      JSON.stringify({
        type: processingType,
        id: parseInt(idsToBeRemoved),
      })
    );
  } catch (error) {}
}

module.exports = {
  processAlertEvent,
  processDeleteAlertEvent,
};
