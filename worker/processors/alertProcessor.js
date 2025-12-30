const redisClient = require("../../api/config/redis.config");
const db = require("../../api/models");
const { getOrder } = require("../../api/services/notificationService/getOrder");
const { Notification, Order } = db;
const {
  getProductVariant,
} = require("../../api/services/notificationService/getProductVariant");
const SOCKET_CHANNEL = "SOCKET_BROADCAST_CHANNEL";

async function processAlertEvent(eventDataString) {
  try {
    let savedNotify;

    if (eventDataString?.order_id) {
      savedNotify = await Notification.findOne({
        where: { order_id: eventDataString.order_id },
      });

      if (savedNotify) {
        await savedNotify.update({
          show_admin: true,
          show_user: true,
        });
      }
    }

    if (!savedNotify) {
      savedNotify = await Notification.create({
        type: eventDataString.processingType,
        variant_id: eventDataString.variant_id || null,
        order_id: eventDataString.order_id || null,
      });
    }

    let socketPayload;
    if (savedNotify.variant_id)
      [socketPayload] = await getProductVariant(savedNotify.id);
    if (savedNotify.order_id) {
      [socketPayload] = await getOrder(savedNotify.id);
    }

    await redisClient.publish(SOCKET_CHANNEL, JSON.stringify(socketPayload));
  } catch (error) {
    console.error(`[Worker] ERROR Alert PROCCESSING:`, error);
  }
}

async function processDeleteAlertEvent(eventDataString) {
  try {
    const { variant_id, order_id, processingType } = eventDataString;

    let whereToDelete = { type: processingType };

    if (variant_id) {
      whereToDelete = {
        ...whereToDelete,
        variant_id: variant_id,
      };
    }

    if (order_id) {
      whereToDelete = {
        ...whereToDelete,
        order_id: order_id,
      };
    }

    const notificationsToDelete = await Notification.findAll({
      where: whereToDelete,
      attributes: ["id"],
    });

    if (notificationsToDelete.length === 0) {
      console.log("Can't find variant", variant_id);
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
