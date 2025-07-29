const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const optionController = require("../controllers/optionController");

router.post(
  "/filter",
  protect,
  authorize("admin"),
  optionController.filterOptions
);
router.post(
  "/create-option",
  protect,
  authorize("admin"),
  optionController.createOption
);

module.exports = router;
