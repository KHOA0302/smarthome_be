require("dotenv").config();
const db = require("../../api/models");
const { ProductEvent } = db;

async function processTrackingEvent(eventDataString) {
  try {
    const {
      user_id,
      variant_id,
      event_type,
      session_id,
      event_time,
      click_counting,
      ...otherFields
    } = eventDataString;

    const [eventRecord, created] = await ProductEvent.findOrCreate({
      where: {
        user_id: user_id,
        variant_id: variant_id,
        event_type: event_type,
      },
      defaults: {
        ...otherFields,
        user_id: user_id,
        variant_id: variant_id,
        session_id: session_id,
        event_type: event_type,
        event_time: event_time,
        click_counting: click_counting,
      },
    });

    if (!created) {
      let newClickCount = 1;

      if (event_type === "view") {
        newClickCount = eventRecord.click_counting + 1;
      } else if (event_type === "add_to_cart") {
        newClickCount = click_counting;
      } else if (event_type === "remove_from_cart") {
        newClickCount = eventRecord.click_counting + 1;
      } else if (event_type === "purchase") {
        newClickCount = eventRecord.click_counting + 1;
      }
      await ProductEvent.update(
        {
          click_counting: newClickCount,
          event_time: event_time,
        },
        {
          where: {
            event_id: eventRecord.event_id,
          },
        }
      );
    }
  } catch (error) {
    console.error(
      `[Processor ERROR] Xử lý sự kiện thất bại: ${error.message}. Dữ liệu: ${eventDataString}`
    );
  }
}

module.exports = { processTrackingEvent };
