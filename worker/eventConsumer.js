const redisClient = require("../api/config/redis.config");
const { processTrackingEvent } = require("./processors/trackingProcessor");
const QUEUE_NAME = "PRODUCT_TRACKING_QUEUE";

async function startWorker() {
  console.log("Worker đang khởi động và lắng nghe Queue......");

  while (true) {
    const item = await redisClient.brpop(QUEUE_NAME, 0);

    if (item) {
      const eventDataString = item[1];

      await processTrackingEvent(eventDataString);
    }
  }
}

startWorker();
