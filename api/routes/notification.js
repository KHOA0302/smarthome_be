const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { identifyUserOrGuest } = require("../middleware/identifyUserOrGuest");

router.get(
  "/get-notification-alert",
  identifyUserOrGuest,
  notificationController.getNotification
);

router.delete(
  "/delete-notification/:notificationId",
  identifyUserOrGuest,
  notificationController.deleteNotification
);

module.exports = router;
