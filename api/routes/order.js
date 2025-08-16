const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { identifyUserOrGuest } = require("../middleware/identifyUserOrGuest");

router.post("/create-order", identifyUserOrGuest, orderController.createOrder);

router.post(
  "/get-order-admin",
  protect,
  authorize("admin"),
  orderController.getOrderAdmin
);

router.post(
  "/get-order-customer",
  identifyUserOrGuest,
  orderController.getOrderCustomer
);

router.get(
  "/get-quarterly-revenue",
  protect,
  authorize("admin"),
  orderController.getOrderQuarterlyRevenue
);

router.put(
  "/edit-order-status",
  protect,
  authorize("admin"),
  orderController.editOrderStatus
);

router.get("/check-vnpay", identifyUserOrGuest, orderController.checkVNPay);
module.exports = router;
