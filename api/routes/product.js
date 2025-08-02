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
  productController.getProductVariantDetails
);

router.post(
  "/details",
  protect,
  authorize("admin"),
  productController.getProductDetails
);

router.get(
  "/all",
  protect,
  authorize("admin"),
  productController.getAllProducts
);

router.post(
  "/edit-imgs",
  protect,
  authorize("admin"),
  productController.editProductImgs
);

router.post(
  "/edit-variants",
  protect,
  authorize("admin"),
  productController.editVariants
);

module.exports = router;
