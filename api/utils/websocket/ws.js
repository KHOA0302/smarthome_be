const WebSocket = require("ws");
const url = require("url");
const jwt = require("jsonwebtoken");
const redisClient = require("../../config/redis.config");
const SOCKET_CHANNEL = "SOCKET_BROADCAST_CHANNEL";
let wss;
const clients = [];

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    clients.push(ws);

    console.log("ws is CONNECTED!!");

    const parameters = url.parse(req.url, true).query;
    const token = parameters.token;
    const sessionId = parameters.sessionId;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ws.user_id = decoded.user_id;
        ws.role_id = decoded.role_id;
        delete ws.sessionId;
      } catch (err) {
        console.error("JWT Verification Failed:", err.message);

        ws.send(
          JSON.stringify({ type: "ERROR", message: "Token expired or invalid" })
        );

        ws.terminate();
        return;
      }
    }

    if (sessionId) {
      ws.session_id = sessionId;
    }

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
      console.error(err);
      return;
    }
  });

  subscriber.on("message", (channel, message) => {
    if (channel === SOCKET_CHANNEL) {
      try {
        const data = JSON.parse(message);
        switch (data.type) {
          case "NEW_INVENTORY_ALERT":
            notifyNewAlert(data);
            break;
          case "DELETE_INVENTORY_ALERT":
            notifyAlertsResolved(data);
            break;
          case "NEW_ORDER_ALERT":
            notifyNewAlert(data);
            break;
          case "DELETE_ORDER_ALERT":
            notifyAlertsResolved(data);
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
    timestamp: new Date().toISOString(),
  });

  const userId = data.order?.user_id;
  const sessionId = data.order?.session_id;

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (client.role_id === 1) {
        client.send(message);
        return;
      }

      if (userId && client.user_id === userId) {
        client.send(message);
        return;
      }

      if (!userId && sessionId && client.session_id === sessionId) {
        client.send(message);
        return;
      }
    }
  });
}

function notifyAlertsResolved(data) {
  if (!wss) {
    return;
  }

  const message = JSON.stringify(data);

  const userId = data.user_id;
  const sessionId = data.session_id;
  const senderRoleId = data.role_id;

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (senderRoleId === 1) {
        if (client.role_id === 1) {
          client.send(message);
        }
        return;
      }

      if (userId && client.user_id === userId) {
        client.send(message);
        return;
      }

      if (!userId && sessionId && client.session_id === sessionId) {
        client.send(message);
        return;
      }
    }
  });
}

module.exports = {
  initWebSocket,
  notifyNewAlert,
  notifyAlertsResolved,
  setupRedisSubscriber,
};
