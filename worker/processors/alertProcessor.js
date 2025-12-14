const redisClient = require("../../api/config/redis.config");
const db = require("../../api/models");
const {
  initWebSocket,
  notifyNewAlert,
  notifyAlertsResolved,
} = require("../../api/utils/websocket/ws");
const SOCKET_CHANNEL = "SOCKET_BROADCAST_CHANNEL";

async function processAlertEvent(eventDataString) {
  try {
    await redisClient.publish(SOCKET_CHANNEL, JSON.stringify(eventDataString));
  } catch (error) {
    console.error(`[Worker] ERROR Alert PROCCESSING:`, error);
  }
}

module.exports = {
  processAlertEvent,
};
