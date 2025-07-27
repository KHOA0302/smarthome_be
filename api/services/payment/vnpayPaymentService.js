const createVnpayOrder = async (orderData) => {
  const newOrder = await db.Order.create({
    ...orderData,
    payment_method: "vnpay",
  });

  const vnpayUrl = await vnpayApi.createPaymentUrl({
    amount: newOrder.order_total,
    orderId: newOrder.order_id,
  });

  return { newOrder, vnpayUrl };
};

module.exports = { createVnpayOrder };
