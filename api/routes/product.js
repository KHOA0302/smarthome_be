const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");

const productController = require("../controllers/productController");

router.post(
  "/add",
  protect,
  authorize("admin"),
  productController.createProductWithDetails
);

router.get(
  "/:product_id/variant/:variant_id",
  productController.getProductDetails
);

module.exports = router;
