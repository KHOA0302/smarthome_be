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
      /////////////////////////////////////////////////////////////////////////////

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

module.exports = { createOrder, getOrder, getOrderQuarterlyRevenue };
