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

    // Gom nhóm số lượng và kiểm tra tồn kho (logic này vẫn giữ nguyên)
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

    // Cập nhật tồn kho
    for (const variant of variants) {
      variant.stock_quantity -= aggregatedQuantities[variant.variant_id];
      await variant.save({ transaction: t });
    }

    // =========================================================================
    //  PHẦN MỚI: TÍNH TOÁN TỔNG GIÁ ĐƠN HÀNG
    // =========================================================================
    let orderTotal = 0;

    // Tạo mảng để lưu trữ OrderItems và OrderItemServices
    const newOrderItemsPayload = [];
    const newOrderItemServicesPayload = [];

    // Tính tổng giá cho từng cart item và các dịch vụ của nó
    for (const cartItem of cart.cartItems) {
      // Tính tổng giá của các dịch vụ cho cart item này
      const servicesTotalPrice = cartItem.cartItemServices.reduce(
        (sum, service) => sum + parseFloat(service.price),
        0
      );

      // Tính tổng giá của cart item: (giá variant + tổng giá dịch vụ) * số lượng
      const cartItemTotalPrice = parseFloat(cartItem.price) * cartItem.quantity;

      // Thêm giá của cart item này vào tổng giá đơn hàng
      orderTotal += cartItemTotalPrice;

      // Chuẩn bị payload cho OrderItem
      const orderItemPayload = {
        variant_id: cartItem.variant_id,
        quantity: cartItem.quantity,
        price: parseFloat(cartItem.price), // giá đơn của variant
        total_price: cartItemTotalPrice,
      };
      newOrderItemsPayload.push(orderItemPayload);
    }

    // =========================================================================
    //  PHẦN CẬP NHẬT: TẠO ORDER VỚI order_total
    // =========================================================================
    const newOrder = await db.Order.create(
      {
        user_id: cart.user_id,
        ...orderData.guestInfo,
        order_total: orderTotal, // Đưa tổng giá đã tính vào đây
        payment_method: "traditional",
        payment_status: "unpaid",
        order_status: "pending",
      },
      { transaction: t }
    );

    // =========================================================================
    //  PHẦN CẬP NHẬT: TẠO ORDERITEMS VÀ ORDERITEMSERVICES
    // =========================================================================

    // Thêm order_id vào payload của OrderItems
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

    // Tạo payload cho OrderItemServices
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

    // Xóa giỏ hàng
    await cart.destroy({ transaction: t });

    return newOrder;
  });

  return result;
};

module.exports = { createTraditionalOrder };
