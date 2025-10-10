require("dotenv").config();
const db = require("../../api/models");

async function processTrackingEvent(eventDataString) {
  try {
    const eventData = JSON.parse(eventDataString);
    const newEvent = await db.ProductEvent.create(eventData);
    console.log(eventData);
  } catch (error) {
    console.error(
      `[Processor ERROR] Xử lý sự kiện thất bại: ${error.message}. Dữ liệu: ${eventDataString}`
    );
  }
}

module.exports = { processTrackingEvent };
