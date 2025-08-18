const db = require("../../models");

const createTraditionalOrder = async (orderData) => {
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

    console.log("Cart fetched:", JSON.stringify(cart, null, 2));

    const aggregatedQuantities = {};
    for (const cartItem of cart.cartItems) {
      const { variant_id, quantity } = cartItem;
      aggregatedQuantities[variant_id] =
        (aggregatedQuantities[variant_id] || 0) + quantity;
    }

    console.log("Aggregated Quantities:", aggregatedQuantities);

    const variantIds = Object.keys(aggregatedQuantities);
    const variants = await db.ProductVariant.findAll({
      where: { variant_id: variantIds },
      lock: true,
      transaction: t,
    });

    console.log("Variants with stock:", JSON.stringify(variants, null, 2));

    const outOfStockItems = variants.filter(
      (variant) =>
        variant.stock_quantity < aggregatedQuantities[variant.variant_id]
    );

    console.log("Out of stock items:", outOfStockItems);

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
      const oldStock = variant.stock_quantity;
      const quantityToSubtract = aggregatedQuantities[variant.variant_id];
      console.log(
        `Updating stock for variant ${
          variant.variant_id
        }: Old=${oldStock}, Subtract=${quantityToSubtract}, New=${
          oldStock - quantityToSubtract
        }`
      );
      variant.stock_quantity -= aggregatedQuantities[variant.variant_id];
      await variant.save({ transaction: t });
    }

    let orderTotal = 0;

    const newOrderItemsPayload = [];
    const newOrderItemServicesPayload = [];

    for (const cartItem of cart.cartItems) {
      const servicesTotalPrice = cartItem.cartItemServices.reduce(
        (sum, service) => sum + parseFloat(service.price),
        0
      );

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

    console.log(orderData.guestInfo);
    const newOrder = await db.Order.create(
      {
        user_id: cart.user_id,
        ...orderData.guestInfo,
        session_id: orderData.sessionId,
        order_total: orderTotal,
        payment_method: "traditional",
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

    await cart.destroy({ transaction: t });

    return newOrder;
  });

  return result;
};

module.exports = { createTraditionalOrder };
