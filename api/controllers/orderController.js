const db = require("../models");
const { Op, Sequelize } = require("sequelize");
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

const { VNPay } = require("vnpay");

const {
  createTraditionalOrder,
} = require("../services/payment/traditionalPaymentService");
const { createVnpayOrder } = require("../services/payment/vnpayPaymentService");
const { getRevenueByYearAndQuarter } = require("../services/orderService");
const { pushEventToQueue } = require("../services/eventQueueService");

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

    if (cart && cart.user_id) {
      if (!userId || cart.user_id !== userId) {
        return res.status(401).json({
          message:
            "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
        });
      }
    } else {
      if (!sessionId || (cart && cart.session_id !== sessionId)) {
        return res.status(401).json({
          message: "Phiên giỏ hàng không hợp lệ. Vui lòng làm mới giỏ hàng.",
        });
      }
    }

    const createOrderFunction = paymentStrategies[method];

    if (!createOrderFunction) {
      return res.status(400).json({ message: "Lỗi tạo Đơn Hàng." });
    }

    const result = await createOrderFunction({
      cartId,
      method,
      userId,
      sessionId,
      guestInfo,
    });

    console.log("result: ", result);

    pushEventToQueue("NEW_ORDER_ALERT", {
      order_id: result.order_id,
      user_id: userId || null,
      session_id: sessionId || null,
    }).catch((error) => {
      console.error(
        `[ORDER Alert Error] Can't push ${result.order_id} into Queue:`,
        error.message
      );
    });

    const completeOrder = await db.Order.findOne({
      where: { order_id: result.order_id },
      include: [
        {
          model: db.OrderItem,
          as: "orderItems",
          include: [
            {
              model: db.ProductVariant,
              as: "productVariant",
            },
          ],
        },
      ],
    });

    completeOrder.orderItems.forEach((item) => {
      handldeTrackingEvent(
        item.variant_id,
        completeOrder.user_id,
        completeOrder.session_id,
        item.price,
        item.quantity,
        "purchase"
      );
    });

    if (method === "traditional") {
      return res.status(201).json(result.order_id);
    } else if (method === "vnpay") {
      return res.status(201).json({
        message: "Tạo Đơn Hàng thành công!!",
        orderId: result.order_id,
        redirect: result.vnpayUrl,
      });
    }
  } catch (error) {
    const errorMessage = error.message;
    console.error(error);
    return res.status(400).json({
      message: errorMessage || "Không thể tạo đơn hàng!!",
    });
  }
};

const handldeTrackingEvent = (
  variantId,
  userId,
  sessionId,
  price,
  counting_number,
  event_type
) => {
  const trackingData = {
    event_type: event_type,
    variant_id: parseInt(variantId),
    user_id: userId || null,
    session_id: sessionId || null,
    price_at_event: parseInt(price),
    click_counting: counting_number,
  };

  pushEventToQueue("PRODUCT_TRACKING", trackingData).catch((error) => {
    console.error("[Tracking Error] Không thể push vào Queue:", error.message);
  });
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
              attributes: [
                "product_id",
                "variant_id",
                "variant_name",
                "image_url",
              ],
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
            {
              model: db.Review,
              as: "reviews",
              attributes: ["review_id", "rating", "comment_text", "created_at"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    if (!orders || orders.length === 0) {
      return res.status(204).json([]);
    }

    const transformedOrders = orders.map((order) => {
      const orderJson = order.toJSON();
      const orderItems = orderJson.orderItems.map((item) => {
        const variantId = item.variant_id;
        const productId = item.productVariant
          ? item.productVariant.product_id
          : null;
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
          variant_id: variantId,
          product_id: productId,
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

const chatbotAskingOrder = async (req, res) => {
  const rawStatus = req.query.status;
  const orderStatus = rawStatus ? rawStatus.split(",") : [];

  let orderIdentifier;

  if (req.isGuest) {
    orderIdentifier = { session_id: req.sessionId };
  } else {
    orderIdentifier = { user_id: req.user.id };
  }

  const whereCondition = {
    ...orderIdentifier,
  };

  if (orderStatus.length > 0) {
    whereCondition.order_status = {
      [Op.in]: orderStatus,
    };
  }

  const orderSummary = await Order.findAll({
    where: whereCondition,
    attributes: [
      "order_status",
      [Sequelize.fn("COUNT", Sequelize.col("order_status")), "count"],
    ],
    group: ["order_status"],
    raw: true,
  });

  return res.status(200).json(orderSummary);
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
        }
      }

      if (status === "cancel" && currentStatus !== "pending") {
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

      pushEventToQueue("NEW_ORDER_ALERT", {
        order_id: order.order_id,
      }).catch((error) => {
        console.error(
          `[ORDER Alert Error] Can't push ${result.order_id} into Queue:`,
          error.message
        );
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
      tmnCode: "HZ671ZDB",
      secureSecret: "6THKU1LUUKK7OL76SVIJBO86KD0AU1J4",
    });

    // Xác thực phản hồi từ VNPay
    const isValidSignature = vnpay.verifyReturnUrl(queryParams);

    if (!isValidSignature.isVerified) {
      console.error("❌ VNPay Signature Verification Failed!");
      return res.redirect("http://localhost:3001/home?status=error");
    }

    const { vnp_TxnRef, vnp_ResponseCode } = queryParams;
    const orderId = vnp_TxnRef;

    if (vnp_ResponseCode === "00") {
      // --- THANH TOÁN THÀNH CÔNG ---
      await db.Order.update(
        { payment_status: "paid" },
        { where: { order_id: orderId } }
      );
      return res.redirect("http://localhost:3001/home?status=paid");
    } else {
      // --- THANH TOÁN THẤT BẠI ---
      console.warn(
        `❌ Payment failed for Order: ${orderId}. Response Code: ${vnp_ResponseCode}`
      );

      ///detele if vnpay fale////
      try {
        const orderToDelete = await db.Order.findByPk(orderId, {
          include: [{ model: db.OrderItem, as: "orderItems" }],
        });

        if (orderToDelete) {
          await db.sequelize.transaction(async (t) => {
            // 1. Cộng trả lại kho (Stock Revert)
            for (const item of orderToDelete.orderItems) {
              await db.ProductVariant.increment("stock_quantity", {
                by: item.quantity,
                where: { variant_id: item.variant_id },
                transaction: t,
              });
            }
            // 2. Xóa đơn hàng hoàn toàn
            await orderToDelete.destroy({ transaction: t });
          });
          console.log(
            `[CLEANUP] Successfully deleted failed order ${orderId} and reverted stock.`
          );
        }
      } catch (cleanupError) {
        console.error("[CLEANUP ERROR]:", cleanupError.message);
      }
      ///end detele if vnpay fale////

      return res.redirect("http://localhost:3001/home?status=failed");
    }
  } catch (error) {
    console.error("Critical Error in checkVNPay:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const loockupPreciusStatus = {
  cancel: "pending",
  preparing: "pending",
  shipping: "preparing",
  completed: "shipping",
};

const editRevertOrderStatus = async (req, res) => {
  const { order_id } = req.params;

  try {
    const order = await db.Order.findByPk(order_id);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const currentStatus = order.order_status;
    const previousStatus = loockupPreciusStatus[currentStatus];

    if (!previousStatus || currentStatus === "pending") {
      return res.status(400).json({
        message: `Không thể quay lại trạng thái trước đó từ trạng thái: ${currentStatus}`,
      });
    }

    order.order_status = previousStatus;
    await order.save();

    pushEventToQueue("NEW_ORDER_ALERT", {
      order_id: order.order_id,
    }).catch((error) => {
      console.error(
        `[ORDER Alert Error] Can't push ${result.order_id} into Queue:`,
        error.message
      );
    });

    return res.status(200).json({
      message: "Hoàn tác trạng thái đơn hàng thành công",
      data: {
        order_id: order.order_id,
        old_status: currentStatus,
        new_status: order.order_status,
      },
    });
  } catch (error) {
    console.error("Lỗi khi hoàn tác trạng thái:", error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

module.exports = {
  createOrder,
  getOrderAdmin,
  getOrderCustomer,
  getOrderQuarterlyRevenue,
  editOrderStatus,
  checkVNPay,
  chatbotAskingOrder,
  editRevertOrderStatus,
};
