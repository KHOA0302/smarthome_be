require("dotenv").config();
const db = require("../../api/models");
const { ProductEvent } = db;

async function processTrackingEvent(eventDataString) {
  try {
    const eventData = JSON.parse(eventDataString);

    const {
      user_id,
      variant_id,
      event_type,
      session_id,
      event_time,
      ...otherFields
    } = eventData;

    let truncatedEventTime = event_time
      ? event_time.substring(0, 10)
      : new Date().toISOString().substring(0, 10);

    const eventDate = new Date(truncatedEventTime);

    console.log(eventDate);

    if (user_id && variant_id) {
      const [eventRecord, created] = await ProductEvent.findOrCreate({
        where: {
          user_id: user_id,
          variant_id: variant_id,
        },
        defaults: {
          ...otherFields,
          user_id: user_id,
          variant_id: variant_id,
          session_id: session_id,
          event_type: event_type || "default_event",
          event_time: eventDate,
        },
      });

      if (!created) {
        const newClickCount = eventRecord.click_counting + 1;

        await ProductEvent.update(
          {
            click_counting: newClickCount,
            event_time: otherFields.event_time || new Date(),
            session_id: session_id,
            event_type: event_type || eventRecord.event_type,
          },
          {
            where: {
              event_id: eventRecord.event_id,
            },
          }
        );
      }
    } else {
      await ProductEvent.create(eventData);
    }
  } catch (error) {
    console.error(
      `[Processor ERROR] Xử lý sự kiện thất bại: ${error.message}. Dữ liệu: ${eventDataString}`
    );
  }
}

module.exports = { processTrackingEvent };
