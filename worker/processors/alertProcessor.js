const redisClient = require("../../api/config/redis.config");

const db = require("../../api/models");
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

module.exports = {
  processAlertEvent,
};
