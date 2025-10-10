const redisClient = require("../config/redis.config");

const QUEUE_NAME = "PRODUCT_TRACKING_QUEUE";

async function pushEventToQueue(eventType, data) {
  const eventRecord = {
    event_time: new Date().toISOString(),
    event_type: eventType,
    ...data,
  };

  await redisClient.lpush(QUEUE_NAME, JSON.stringify(eventRecord));
}

module.exports = { pushEventToQueue };
