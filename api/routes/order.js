const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post(
  "/create-order",
  protect,
  authorize("customer"),
  orderController.createOrder
);

router.post(
  "/get-order",
  protect,
  authorize("admin"),
  orderController.getOrder
);

router.get(
  "/get-quarterly-revenue",
  protect,
  authorize("admin"),
  orderController.getOrderQuarterlyRevenue
);

router.get(
  "/check-vnpay",
  orderController.checkVNPay
);


module.exports = router;
