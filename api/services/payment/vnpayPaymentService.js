const { VNPay, dateFormat } = require("vnpay");
const db = require("../../models");
const eventQueueService = require("../eventQueueService");

const createVnpayOrder = async (orderData) => {
  const variantsToAlert = [];
  const result = await db.sequelize.transaction(async (t) => {
    // 1. Lấy thông tin giỏ hàng
    const cart = await db.Cart.findByPk(orderData.cartId, {
      include: [
        {
          model: db.CartItem,
          as: "cartItems",
          include: [
            {
              model: db.CartItemService,
              as: "cartItemServices",
              include: [
                { model: db.PackageServiceItem, as: "packageServiceItem" },
              ],
            },
            {
              model: db.ProductVariant,
              as: "productVariant",
              include: [
                {
                  model: db.Promotion,
                  as: "promotions",
                  where: { is_active: true },
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!cart) throw new Error("Cart not found.");

    // 2. Gom nhóm và kiểm tra tồn kho
    const aggregatedQuantities = {};
    for (const cartItem of cart.cartItems) {
      const { variant_id, quantity } = cartItem;
      aggregatedQuantities[variant_id] =
        (aggregatedQuantities[variant_id] || 0) + quantity;
    }

    const variants = await db.ProductVariant.findAll({
      where: { variant_id: Object.keys(aggregatedQuantities) },
      lock: true,
      transaction: t,
    });

    for (const variant of variants) {
      if (variant.item_status !== "in_stock")
        throw new Error(`Sản phẩm ${variant.variant_name} tạm ngưng bán.`);
      if (variant.stock_quantity < aggregatedQuantities[variant.variant_id])
        throw new Error(`Sản phẩm ${variant.variant_name} không đủ hàng.`);
    }

    // 3. Cập nhật tồn kho (Trừ kho ngay lập tức)
    for (const variant of variants) {
      variant.stock_quantity -= aggregatedQuantities[variant.variant_id];
      await variant.save({ transaction: t });
      if (variant.stock_quantity === 0)
        variantsToAlert.push({ variant_id: variant.variant_id });
    }

    // 4. Tính toán tổng tiền
    let orderTotal = 0;
    const newOrderItemsPayload = [];
    for (const cartItem of cart.cartItems) {
      const variant = cartItem.productVariant;
      const basePrice = parseFloat(variant.price);
      let servicePriceTotal = 0;
      for (const cartService of cartItem.cartItemServices) {
        servicePriceTotal += parseFloat(
          cartService.packageServiceItem.item_price_impact || 0
        );
      }
      let discountValue =
        variant.promotions && variant.promotions.length > 0
          ? parseFloat(variant.promotions[0].discount_value || 0)
          : 0;

      const discountedVariantPrice = (basePrice * (100 - discountValue)) / 100;
      const fullPricePerItem = discountedVariantPrice + servicePriceTotal;
      const itemTotalPrice = fullPricePerItem * cartItem.quantity;
      orderTotal += itemTotalPrice;

      newOrderItemsPayload.push({
        variant_id: cartItem.variant_id,
        quantity: cartItem.quantity,
        price: fullPricePerItem,
        total_price: itemTotalPrice,
        originalCartItem: cartItem,
      });
    }

    // 5. Tạo Order (Trạng thái pending)
    const newOrder = await db.Order.create(
      {
        user_id: cart.user_id,
        ...orderData.guestInfo,
        session_id: orderData.sessionId,
        order_total: orderTotal,
        payment_method: "vnpay",
        payment_status: "unpaid",
        order_status: "pending",
      },
      { transaction: t }
    );

    // 6. Tạo OrderItems và Services
    const createdOrderItems = await db.OrderItem.bulkCreate(
      newOrderItemsPayload.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.price,
        total_price: item.total_price,
        order_id: newOrder.order_id,
      })),
      { transaction: t }
    );

    const newOrderItemServicesPayload = [];
    for (let i = 0; i < newOrderItemsPayload.length; i++) {
      const originalCartItem = newOrderItemsPayload[i].originalCartItem;
      for (const cartItemService of originalCartItem.cartItemServices) {
        newOrderItemServicesPayload.push({
          order_item_id: createdOrderItems[i].order_item_id,
          package_service_item_id: cartItemService.package_service_item_id,
          price: parseFloat(
            cartItemService.packageServiceItem.item_price_impact || 0
          ),
        });
      }
    }
    await db.OrderItemService.bulkCreate(newOrderItemServicesPayload, {
      transaction: t,
    });

    // 7. XÓA GIỎ HÀNG NGAY LẬP TỨC
    await cart.destroy({ transaction: t });

    // 8. Tạo VNPay URL (Redirect về Backend cổng 8000)
    const vnpay = new VNPay({
      tmnCode: "HZ671ZDB",
      secureSecret: "6THKU1LUUKK7OL76SVIJBO86KD0AU1J4",
    });

    const vnp_ReturnUrl = orderData.userId
      ? `http://localhost:8000/order/check-vnpay?userId=${orderData.userId}`
      : `http://localhost:8000/order/check-vnpay?sessionId=${orderData.sessionId}`;
      
    const vnpayUrl = vnpay.buildPaymentUrl({
      vnp_Amount: newOrder.order_total,
      vnp_TxnRef: `${newOrder.order_id}`,
      vnp_IpAddr: "127.0.0.1",
      vnp_OrderInfo: `Thanh toán đơn hàng ${newOrder.order_id}`,
      vnp_ReturnUrl,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(new Date(Date.now() + 30 * 60 * 1000)),
    });

    return { ...newOrder.get({ plain: true }), vnpayUrl };
  });

  if (variantsToAlert.length > 0) {
    variantsToAlert.forEach((data) =>
      eventQueueService
        .pushEventToQueue("NEW_INVENTORY_ALERT", data)
        .catch(console.error)
    );
  }

  return result;
};

module.exports = { createVnpayOrder };
