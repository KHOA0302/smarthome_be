const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const serviceController = require("../controllers/serviceController");

router.post(
  "/filter",
  protect,
  authorize("admin"),
  serviceController.filterServices
);

router.post(
  "/create-service",
  protect,
  authorize("admin"),
  serviceController.createService
);

router.put(
  "/update",
  protect,
  authorize("admin"),
  serviceController.updateService
);

module.exports = router;
