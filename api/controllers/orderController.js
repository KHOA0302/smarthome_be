const {
  createTraditionalOrder,
} = require("../services/payment/traditionalPaymentService");
const { createVnpayOrder } = require("../services/payment/vnpayPaymentService");
const {
  getOrdersByStatus,
  getRevenueByYearAndQuarter,
} = require("../services/orderService");

const paymentStrategies = {
  traditional: createTraditionalOrder,
  vnpay: createVnpayOrder,
};

const { Order, Cart } = require("../models");

const createOrder = async (req, res) => {
  const { cartId, method } = req.body;

  try {
    const createOrderFunction = paymentStrategies[method];

    if (!createOrderFunction) {
      return res.status(400).json({ message: "Invalid payment method." });
    }

    const result = await createOrderFunction({ cartId, method });

    if (method === "traditional") {
      return res.status(201).json({
        message: "Order created successfully. Please wait for confirmation.",
        orderId: result.order_id,
        redirect: "/order-success",
      });
    } else if (method === "vnpay") {
      return res.status(201).json({
        message: "Order created successfully. Redirecting to payment gateway.",
        orderId: result.newOrder.order_id,
        redirect: result.vnpayUrl,
      });
    }
  } catch (error) {}
};

const getOrder = async (req, res) => {
  const { orderStatus } = req.body;

  if (!orderStatus) {
    return res.status(400).json({ message: "Order status is required." });
  }

  try {
    const orders = await getOrdersByStatus(orderStatus);

    if (orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders found for the specified status." });
    }

    return res.status(200).json(orders);
  } catch (error) {
    console.error("Error in getOrder controller:", error);
    if (error.message.includes("Invalid order status")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};

const getOrderQuarterlyRevenue = async (req, res) => {
  try {
    const startYear = req.query.startYear
      ? parseInt(req.query.startYear, 10)
      : undefined;
    const endYear = req.query.endYear
      ? parseInt(req.query.endYear, 10)
      : undefined;

    if (
      startYear !== undefined &&
      (isNaN(startYear) || startYear < 1900 || startYear > 2100)
    ) {
      return res.status(400).send({
        message:
          "Invalid startYear parameter. Please provide a valid year (e.g., ?startYear=2023).",
      });
    }
    if (
      endYear !== undefined &&
      (isNaN(endYear) || endYear < 1900 || endYear > 2100)
    ) {
      return res.status(400).send({
        message:
          "Invalid endYear parameter. Please provide a valid year (e.g., ?endYear=2024).",
      });
    }
    if (startYear && endYear && startYear > endYear) {
      return res.status(400).send({
        message: "startYear cannot be greater than endYear.",
      });
    }

    const revenueData = await getRevenueByYearAndQuarter(startYear, endYear);

    res.status(200).json(revenueData);
  } catch (error) {
    console.error("Error in getRevenueByYearAndQuarter controller:", error);

    res.status(500).send({
      message:
        error.message ||
        "An unexpected error occurred while fetching revenue data.",
    });
  }
};

const checkVNPay = async (req, res) => {
  try {
    const queryParams = req.query;

    const vnpay = new VNPay({
      tmnCode: "0TSSC1QT",
      secureSecret: "OTYGF8UKW9QVWWTE0BTY82Z1P3LOUA47",
    });

    const isValidSignature = vnpay.verifyReturnUrl(queryParams);

    if (!isValidSignature.isVerified || !isValidSignature.isSuccess) {
      await Order.destroy({ where: { order_id: orderId } });
      return res.redirect(
        "https://your-frontend.com/payment-fail?error=invalid-signature"
      );
    }

    const { vnp_TxnRef, vnp_ResponseCode, userId, sessionId } = queryParams;
    const orderId = vnp_TxnRef;
    if (vnp_ResponseCode === "00") {
      console.log("✅ Payment success:", vnp_TxnRef);

      if (userId) {
        await Cart.destroy({ where: { user_id: userId } });
      }

      if (sessionId) {
        await Cart.destroy({ where: { session_id: sessionId } });
      }

      return res.redirect(
        // Trở về trang thanh toán thành công với query orderId
        `http://your-frontend.com/payment-success?orderId=${orderId}`
      );
    } else {
      console.warn("❌ Payment failed:", vnp_TxnRef);

      await Order.destroy({ where: { order_id: orderId } });

      return res.redirect(
        // Trở về trang thanh toán thất bại
        `http://your-frontend.com/payment-fail`
      );
    }
  } catch (error) {
    console.error("Error in checkVNPay controller:", error);

    res.status(500).send({
      message:
        error.message ||
        "An unexpected error occurred while fetching revenue data.",
    });
  }
};

module.exports = {
  createOrder,
  getOrder,
  getOrderQuarterlyRevenue,
  checkVNPay,
};
