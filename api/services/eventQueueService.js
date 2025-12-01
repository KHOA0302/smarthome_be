const redisClient = require("../config/redis.config");

const QUEUE_NAME = "MAIN_WORKER_QUEUE";

async function pushEventToQueue(processingType, data) {
  const eventRecord = {
    event_time: new Date().toISOString(),
    processingType,
    ...data,
  };

  await redisClient.lpush(QUEUE_NAME, JSON.stringify(eventRecord));
}

module.exports = { pushEventToQueue };
