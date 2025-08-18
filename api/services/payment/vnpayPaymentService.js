const { VNPay, dateFormat } = require("vnpay");
const db = require("../../models");

const createVnpayOrder = async (orderData) => {
  const result = await db.sequelize.transaction(async (t) => {
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
                {
                  model: db.PackageServiceItem,
                  as: "packageServiceItem",
                },
              ],
            },
            {
              model: db.ProductVariant,
              as: "productVariant",
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!cart) {
      throw new Error("Cart not found.");
    }

    const aggregatedQuantities = {};
    for (const cartItem of cart.cartItems) {
      const { variant_id, quantity } = cartItem;
      aggregatedQuantities[variant_id] =
        (aggregatedQuantities[variant_id] || 0) + quantity;
    }

    const variantIds = Object.keys(aggregatedQuantities);
    const variants = await db.ProductVariant.findAll({
      where: { variant_id: variantIds },
      lock: true,
      transaction: t,
    });

    const outOfStockItems = variants.filter(
      (variant) =>
        variant.stock_quantity < aggregatedQuantities[variant.variant_id]
    );

    if (outOfStockItems.length > 0) {
      const errorMsg = outOfStockItems
        .map(
          (item) =>
            `Sản phẩm ${item.variant_name} không đủ hàng. Tồn kho: ${
              item.stock_quantity
            }, Yêu cầu: ${aggregatedQuantities[item.variant_id]}.`
        )
        .join(" ");
      throw new Error(errorMsg);
    }

    
    for (const variant of variants) {
      variant.stock_quantity -= aggregatedQuantities[variant.variant_id];
      await variant.save({ transaction: t });
    }

   
    let orderTotal = 0;

  
    const newOrderItemsPayload = [];
    const newOrderItemServicesPayload = [];

    
    for (const cartItem of cart.cartItems) {
      
      const cartItemTotalPrice = parseFloat(cartItem.price) * cartItem.quantity;

      
      orderTotal += cartItemTotalPrice;

      
      const orderItemPayload = {
        variant_id: cartItem.variant_id,
        quantity: cartItem.quantity,
        price: parseFloat(cartItem.price), 
        total_price: cartItemTotalPrice,
      };
      newOrderItemsPayload.push(orderItemPayload);
    }

    
    const newOrder = await db.Order.create(
      {
        user_id: cart.user_id,
        ...orderData.guestInfo,
        order_total: orderTotal, 
        payment_method: "vnpay",
        payment_status: "unpaid",
        order_status: "pending",
      },
      { transaction: t }
    );

    
    const orderItemsWithOrderId = newOrderItemsPayload.map((item) => ({
      ...item,
      order_id: newOrder.order_id,
    }));

    const createdOrderItems = await db.OrderItem.bulkCreate(
      orderItemsWithOrderId,
      {
        transaction: t,
      }
    );

    
    for (let i = 0; i < cart.cartItems.length; i++) {
      const cartItem = cart.cartItems[i];
      const createdOrderItem = createdOrderItems[i];

      for (const cartItemService of cartItem.cartItemServices) {
        newOrderItemServicesPayload.push({
          order_item_id: createdOrderItem.order_item_id,
          package_service_item_id: cartItemService.package_service_item_id,
          price: parseFloat(cartItemService.price),
        });
      }
    }

    await db.OrderItemService.bulkCreate(newOrderItemServicesPayload, {
      transaction: t,
    });

    const vnpay = new VNPay({
      tmnCode: "0TSSC1QT",
      secureSecret: "OTYGF8UKW9QVWWTE0BTY82Z1P3LOUA47",
    });

    const currentDate = new Date();
    const vnp_CreateDate = dateFormat(currentDate);
    const vnp_ExpireDate = dateFormat(
      new Date(currentDate.getTime() + 30 * 60 * 1000)
    ); 

    const vnp_ReturnUrl = orderData.userId
      ? `http://localhost:8080/order/check-vnpay?userId=${orderData.userId}`
      : `http://localhost:8080/order/check-vnpay?sessionId=${orderData.sessionId}`;

    const vnpayUrl = vnpay.buildPaymentUrl({
      vnp_Amount: newOrder.order_total,
      vnp_TxnRef: `${newOrder.order_id}`,
      vnp_IpAddr: "127.0.0.1",
      vnp_OrderInfo: `${newOrder.order_id}`,
      vnp_ReturnUrl,
      vnp_CreateDate,
      vnp_ExpireDate,
    });

    return { newOrder, vnpayUrl };
  });

  return result;
};

module.exports = { createVnpayOrder };
