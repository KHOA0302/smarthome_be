const express = require("express");
const router = express.Router();
const promotionController = require("../controllers/promotionController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post(
  "/create-promotion",
  protect,
  authorize("admin"),
  promotionController.createPromotion
);

router.get(
  "/get-promotion",
  protect,
  authorize("admin"),
  promotionController.getPromotion
);

router.delete(
  "/delete-promotion/:promotionId",
  protect,
  authorize("admin"),
  promotionController.deletePromotion
);

module.exports = router;
