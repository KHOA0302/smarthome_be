const WebSocket = require("ws");
const redisClient = require("../../config/redis.config");
const SOCKET_CHANNEL = "SOCKET_BROADCAST_CHANNEL";
let wss;
const clients = [];

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    clients.push(ws);

    console.log("connected");

    ws.on("close", () => {
      clients.splice(clients.indexOf(ws), 1);
    });

    ws.on("error", (error) => {
      console.error("Lỗi WebSocket từ Client:", error);
    });
  });
}

function setupRedisSubscriber() {
  const subscriber = redisClient.duplicate();

  subscriber.subscribe(SOCKET_CHANNEL, (err) => {
    if (err) {
      console.error("Lỗi đăng ký kênh Redis:", err);
      return;
    }
    console.log(
      `[WebSocket] Đã đăng ký lắng nghe kênh Redis: ${SOCKET_CHANNEL}`
    );
  });

  subscriber.on("message", (channel, message) => {
    if (channel === SOCKET_CHANNEL) {
      try {
        const data = JSON.parse(message);
        switch (data.type) {
          case "NEW_INVENTORY_ALERT":
            notifyNewAlert(data);
            break;

          default:
            break;
        }
      } catch (e) {
        console.error("Lỗi parse JSON từ Redis PubSub:", e);
      }
    }
  });
}

function notifyNewAlert(data) {
  if (!wss) {
    return;
  }

  const message = JSON.stringify({
    ...data,
    type: "NEW_INVENTORY_ALERT",
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function notifyAlertsResolved(data) {
  if (!wss) {
    return;
  }

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

module.exports = {
  initWebSocket,
  notifyNewAlert,
  notifyAlertsResolved,
  setupRedisSubscriber,
};
