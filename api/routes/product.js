const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const productController = require("../controllers/productController");
const { identifyUserOrGuest } = require("../middleware/identifyUserOrGuest");

router.post(
  "/add",
  protect,
  authorize("admin"),
  productController.createProductWithDetails
);

router.get(
  "/:product_id/variant/:variant_id",
  identifyUserOrGuest,
  productController.getProductVariantDetails
);

router.get(
  "/details/:productId",
  protect,
  authorize("admin"),
  productController.getProductDetails
);

router.post(
  "/all",
  protect,
  authorize("admin"),
  productController.getAllProductsByFilter
);

router.put(
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

router.put(
  "/edit-service",
  protect,
  authorize("admin"),
  productController.editService
);

router.put(
  "/edit-specifications",
  protect,
  authorize("admin"),
  productController.editSpecifications
);

router.put(
  "/edit-product-info",
  protect,
  authorize("admin"),
  productController.editProductBasicInfo
);

router.get("/search", productController.searchTopProducts);

router.get("/get-top-sale/:limit", productController.getTopSaleVariants);
router.get("/get-latest-product/:limit", productController.getLatestProducts);
router.post("/get-product-by-filter", productController.getPageProductByfilter);

router.get("/chatbot-asking-product", productController.chatbotAskingProduct);

router.get(
  "/prediction",
  protect,
  authorize("admin"),
  productController.getProductPrediction
);

router.put(
  "/edit-product-visibility",
  protect,
  authorize("admin"),
  productController.editProductVisibility
);

router.get(
  "/get-all-variants",
  protect,
  authorize("admin"),
  productController.getAllProductVariants
);

module.exports = router;
