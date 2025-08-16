const db = require("../models");
const {
  Cart,
  Order,
  OrderItem,
  OrderItemService,
  PackageServiceItem,
  Service,
  ProductVariant,
  Product,
} = db;

const { VNPay, dateFormat } = require("vnpay");

const {
  createTraditionalOrder,
} = require("../services/payment/traditionalPaymentService");
const { createVnpayOrder } = require("../services/payment/vnpayPaymentService");
const { getRevenueByYearAndQuarter } = require("../services/orderService");

const paymentStrategies = {
  traditional: createTraditionalOrder,
  vnpay: createVnpayOrder,
};

const createOrder = async (req, res) => {
  const { cartId, method, guestInfo } = req.body;
  const userId = req.user?.id;
  const sessionId = req.sessionId;

  try {
    const cart = await Cart.findByPk(cartId);
    if (cart.user_id) {
      if (!userId || cart.user_id !== userId) {
        return res.status(401).json({
          message:
            "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
        });
      }
    } else {
      if (!sessionId || cart.session_id !== sessionId) {
        return res.status(401).json({
          message: "Phiên giỏ hàng không hợp lệ. Vui lòng làm mới giỏ hàng.",
        });
      }
    }

    const createOrderFunction = paymentStrategies[method];

    if (!createOrderFunction) {
      return res.status(400).json({ message: "Invalid payment method." });
    }

    const result = await createOrderFunction({
      cartId,
      method,
      userId,
      sessionId,
      guestInfo,
    });

    if (method === "traditional") {
      return res.status(201).json(result.order_id);
    } else if (method === "vnpay") {
      return res.status(201).json({
        message: "Order created successfully. Redirecting to payment gateway.",
        orderId: result.newOrder.order_id,
        redirect: result.vnpayUrl,
      });
    }
  } catch (error) {
    return res.status(400).json({ message: "Error" });
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

const getOrderAdmin = async (req, res) => {
  const { status } = req.body;

  try {
    const whereCondition = {};

    if (Array.isArray(status) && status.length > 0) {
      whereCondition.order_status = { [db.Sequelize.Op.in]: status };
    }

    const orders = await Order.findAll({
      where: whereCondition,
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          include: [
            {
              model: db.ProductVariant,
              as: "productVariant",
              attributes: ["variant_name", "image_url"],
            },
            {
              model: OrderItemService,
              as: "orderItemServices",
              include: [
                {
                  model: PackageServiceItem,
                  as: "packageServiceItem",
                  include: [
                    {
                      model: Service,
                      as: "serviceDefinition",
                      attributes: ["service_name"],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          model: db.User,
          as: "user",
        },
      ],
      order: [["created_at", "DESC"]],
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng nào." });
    }

    const transformedOrders = orders.map((order) => {
      const orderJson = order.toJSON();
      const orderItems = orderJson.orderItems.map((item) => {
        const variantName = item.productVariant
          ? item.productVariant.variant_name
          : null;
        const imageUrl = item.productVariant
          ? item.productVariant.image_url
          : null;
        const orderItemServices = item.orderItemServices.map((service) => {
          const serviceName =
            service.packageServiceItem.serviceDefinition.service_name;
          return {
            ...service,
            service_name: serviceName,
          };
        });
        return {
          ...item,
          variant_name: variantName,
          image_url: imageUrl,
          orderItemServices,
          productVariant: undefined,
        };
      });

      const user = orderJson.user || {
        id: null,
        email: orderJson.guest_email,
        name: orderJson.guest_name,
      };

      return {
        ...orderJson,
        orderItems,
        user: user,
      };
    });

    return res.status(200).json(transformedOrders);
  } catch (error) {
    console.error("Lỗi khi lấy đơn hàng (Admin):", error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
};

const getOrderCustomer = async (req, res) => {
  const { status } = req.body;
  let orderIdentifier;

  if (req.isGuest) {
    orderIdentifier = { session_id: req.sessionId };
  } else {
    orderIdentifier = { user_id: req.user.id };
  }

  try {
    const whereCondition = { ...orderIdentifier };

    if (Array.isArray(status) && status.length > 0) {
      whereCondition.order_status = { [db.Sequelize.Op.in]: status };
    }

    const orders = await Order.findAll({
      where: whereCondition,
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          include: [
            {
              model: db.ProductVariant,
              as: "productVariant",
              attributes: ["variant_name", "image_url"],
            },
            {
              model: OrderItemService,
              as: "orderItemServices",
              include: [
                {
                  model: PackageServiceItem,
                  as: "packageServiceItem",
                  include: [
                    {
                      model: Service,
                      as: "serviceDefinition",
                      attributes: ["service_name"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json([]);
    }

    const transformedOrders = orders.map((order) => {
      const orderJson = order.toJSON();
      const orderItems = orderJson.orderItems.map((item) => {
        const variantName = item.productVariant
          ? item.productVariant.variant_name
          : null;
        const imageUrl = item.productVariant
          ? item.productVariant.image_url
          : null;

        const orderItemServices = item.orderItemServices.map((service) => {
          const serviceName =
            service.packageServiceItem.serviceDefinition.service_name;
          return {
            ...service,
            service_name: serviceName,
          };
        });

        return {
          ...item,
          variant_name: variantName,
          image_url: imageUrl,
          orderItemServices,
          productVariant: undefined,
        };
      });

      return {
        ...orderJson,
        orderItems,
      };
    });

    return res.status(200).json(transformedOrders);
  } catch (error) {
    console.error("Lỗi khi lấy đơn hàng:", error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
};

const editOrderStatus = async (req, res) => {
  const { orderId, status } = req.body;

  try {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          include: [
            {
              model: ProductVariant,
              as: "productVariant",
              include: [
                {
                  model: Product,
                  as: "product",
                },
              ],
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    const currentStatus = order.order_status;
    let payment_status = "unpaid";

    if (currentStatus !== status) {
      if (currentStatus === "pending" && status === "preparing") {
        for (const item of order.orderItems) {
          const variant = item.productVariant;
          const newStock = variant.stock_quantity - item.quantity;

          if (newStock < 0) {
            return res.status(400).json({
              message: `Không đủ số lượng sản phẩm '${variant.variant_name}' trong kho.`,
            });
          }

          await variant.update({ stock_quantity: newStock });
        }
      }

      if (status === "cancelled" && currentStatus !== "pending") {
        for (const item of order.orderItems) {
          const variant = item.productVariant;
          const newStock = variant.stock_quantity + item.quantity;
          await variant.update({ stock_quantity: newStock });
        }
      }

      if (status === "completed") {
        for (const item of order.orderItems) {
          const product = item.productVariant.product;
          const newSaleVolume = product.sale_volume + item.quantity;
          await product.update({ sale_volume: newSaleVolume });
        }
        payment_status = "paid";
      }

      await order.update({
        order_status: status,
        payment_status: payment_status,
      });

      return res
        .status(200)
        .json({ message: "Trạng thái đơn hàng đã được cập nhật thành công." });
    } else {
      return res
        .status(400)
        .json({ message: "Trạng thái đơn hàng CHƯA thay đổi." });
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái đơn hàng:", error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
};

const checkVNPay = async (req, res) => {
  const { userId, sessionId, ...queryParams } = req.query;

  try {
    const vnpay = new VNPay({
      tmnCode: "0TSSC1QT",
      secureSecret: "OTYGF8UKW9QVWWTE0BTY82Z1P3LOUA47",
    });

    const isValidSignature = vnpay.verifyReturnUrl(queryParams);

    if (!isValidSignature.isVerified || !isValidSignature.isSuccess) {
      return res.redirect("http://localhost:3001/home");
    }

    const { vnp_TxnRef, vnp_ResponseCode } = queryParams;
    const orderId = vnp_TxnRef;
    if (vnp_ResponseCode === "00") {
      console.log("✅ Payment success:", vnp_TxnRef);

      await Order.update(
        { payment_status: "paid" },
        { where: { order_id: orderId } }
      );

      if (userId) {
        await Cart.destroy({ where: { user_id: userId } });
      }

      if (sessionId) {
        await Cart.destroy({ where: { session_id: sessionId } });
      }

      return res.redirect("http://localhost:3001/home");
    } else {
      console.warn("❌ Payment failed:", vnp_TxnRef);

      await Order.destroy({ where: { order_id: orderId } });

      return res.redirect("http://localhost:3001/home");
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
  getOrderAdmin,
  getOrderCustomer,
  getOrderQuarterlyRevenue,
  editOrderStatus,
  checkVNPay,
};
