const db = require("../../models");
const eventQueueService = require("../eventQueueService");
const {
  CartItem,
  CartItemService,
  PackageServiceItem,
  ProductVariant,
  Order,
  Cart,
  sequelize,
  Promotion,
  PromotionVariant,
  ServicePackage,
} = db;

const createTraditionalOrder = async (orderData) => {
  const variantsToAlert = [];
  const result = await sequelize.transaction(async (t) => {
    const cart = await Cart.findByPk(orderData.cartId, {
      include: [
        {
          model: CartItem,
          as: "cartItems",
          include: [
            {
              model: CartItemService,
              as: "cartItemServices",
              include: [
                {
                  model: PackageServiceItem,
                  as: "packageServiceItem",
                },
              ],
            },
            {
              model: ProductVariant,
              as: "productVariant",
              ////Code mới////
              include: [
                {
                  model: Promotion,
                  as: "promotions",
                  where: {
                    is_active: true,
                    // Bạn có thể thêm điều kiện ngày tháng ở đây nếu cần
                  },
                  required: false,
                },
              ],
              ////end code mới//////
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

    // --- BẮT ĐẦU PHẦN THÊM MỚI ---
    for (const variant of variants) {
      if (variant.item_status !== "in_stock") {
        throw new Error(`Sản phẩm ${variant.variant_name} hiện tạm ngưng bán.`);
      }
    }
    // --- KẾT THÚC PHẦN THÊM MỚI ---

    const outOfStockItems = variants.filter(
      (variant) =>
        variant.stock_quantity < aggregatedQuantities[variant.variant_id]
    );

    if (outOfStockItems.length > 0) {
      const errorMsg = outOfStockItems
        .map((item) => `Sản phẩm ${item.variant_name} không đủ hàng.`)
        .join(" ");
      throw new Error(errorMsg);
    }

    for (const variant of variants) {
      variant.stock_quantity -= aggregatedQuantities[variant.variant_id];
      await variant.save({ transaction: t });

      if (variant.stock_quantity === 0) {
        variantsToAlert.push({
          variant_id: variant.variant_id,
        });
      }
    }

    let orderTotal = 0;

    const newOrderItemsPayload = [];
    const newOrderItemServicesPayload = [];

    for (const cartItem of cart.cartItems) {
      // const cartItemTotalPrice = parseFloat(cartItem.price) * cartItem.quantity;

      // orderTotal += cartItemTotalPrice;

      // const orderItemPayload = {
      //   variant_id: cartItem.variant_id,
      //   quantity: cartItem.quantity,
      //   price: parseFloat(cartItem.price),
      //   total_price: cartItemTotalPrice,
      // };

      ////Code mới////
      const variant = cartItem.productVariant;
      const basePrice = parseFloat(variant.price);

      // 1. Tính tổng giá dịch vụ (servicePrice)
      let servicePriceTotal = 0;
      for (const cartService of cartItem.cartItemServices) {
        console.log(cartService);
        const impact = parseFloat(
          cartService.packageServiceItem.item_price_impact || 0
        );
        servicePriceTotal += impact;
      }

      // 2. Kiểm tra Discount từ Promotion
      let discountValue = 0;
      if (variant.promotions && variant.promotions.length > 0) {
        // Lấy khuyến mãi đầu tiên đang active
        discountValue = parseFloat(variant.promotions[0].discount_value || 0);
      }

      // 3. Tính fullPrice theo logic: price*(100-discount)/100 + servicePrice
      const discountedVariantPrice = (basePrice * (100 - discountValue)) / 100;
      const fullPricePerItem = discountedVariantPrice + servicePriceTotal;
      const itemTotalPrice = fullPricePerItem * cartItem.quantity;

      orderTotal += itemTotalPrice;

      const orderItemPayload = {
        variant_id: cartItem.variant_id,
        quantity: cartItem.quantity,
        price: fullPricePerItem, // Lưu giá đã cộng dịch vụ và trừ giảm giá
        total_price: itemTotalPrice,
      };
      ////end code mới//////

      newOrderItemsPayload.push(orderItemPayload);
    }

    const newOrder = await Order.create(
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
          ////Code mới////
          price: parseFloat(
            cartItemService.packageServiceItem.item_price_impact || 0
          ),
          ////end code mới//////
        });
      }
    }

    await db.OrderItemService.bulkCreate(newOrderItemServicesPayload, {
      transaction: t,
    });

    await cart.destroy({ transaction: t });

    return newOrder;
  });

  if (variantsToAlert.length > 0) {
    variantsToAlert.forEach((singleVariantData) => {
      eventQueueService
        .pushEventToQueue("NEW_INVENTORY_ALERT", singleVariantData)
        .catch((error) => {
          console.error(
            `[Inventory Alert Error] Can't push ${singleVariantData.variant_id} into Queue:`,
            error.message
          );
        });
    });
  }

  return result;
};

module.exports = { createTraditionalOrder };
