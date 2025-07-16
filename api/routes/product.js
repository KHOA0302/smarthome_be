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

module.exports = router;
