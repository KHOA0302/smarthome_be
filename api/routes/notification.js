const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

router.get(
  "/get-notification-alert",
  protect,
  authorize("admin"),
  notificationController.getNotification
);

module.exports = router;
