const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const attributeController = require("../controllers/attributeController");

router.post("/filter", attributeController.getAttributesByCategory);
router.post(
  "/create-group",
  protect,
  authorize("admin"),
  attributeController.createGroupAndAttribute
);

module.exports = router;
