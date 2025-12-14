const redisClient = require("../api/config/redis.config");
const { processTrackingEvent } = require("./processors/trackingProcessor");
const { processAlertEvent } = require("./processors/alertProcessor");
const QUEUE_NAME = "MAIN_WORKER_QUEUE";

async function startWorker() {
  console.log("Worker đang khởi động và lắng nghe Queue......");

  while (true) {
    const item = await redisClient.brpop(QUEUE_NAME, 0);

    if (item) {
      const eventDataString = item[1];

      try {
        const job = JSON.parse(eventDataString);
        switch (job.processingType) {
          case "PRODUCT_TRACKING":
            await processTrackingEvent(job);
            break;
          case "INVENTORY_ALERT":
            await processAlertEvent(job);
            break;
          default:
            console.warn(`[Worker] Job type không xác định: ${job.type}`);
        }
      } catch (error) {
        console.error("[Worker] Lỗi phân tích cú pháp hoặc xử lý Job:", error);
      }
    }
  }
}

startWorker();
