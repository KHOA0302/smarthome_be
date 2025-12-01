const db = require("../../api/models");
const wsManager = require("../../api/utils/websocket/ws");

async function processAlertEvent(eventDataString) {
  try {
    const { variantData } = JSON.parse(eventDataString);

    const newAlert = await db.OutOfStockNotify.create({
      variant_id: variantData.variant_id,
      product_id: variantData.product_id,
      variant_name: variantData.variant_name,
      image_url: variantData.image_url,
      status: "NEW",
    });

    wsManager.notifyNewAlert(
      newAlert.alert_id,
      newAlert.product_id,
      newAlert.variant_name,
      newAlert.image_url
    );
  } catch (error) {
    console.error(`[Worker] ERROR Alert PROCCESSING:`, error);
  }
}

module.exports = {
  processAlertEvent,
};
