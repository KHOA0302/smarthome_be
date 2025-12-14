const db = require("../models");
const { Service, Review, Sequelize, User, OrderItem, Order } = db;
const Op = Sequelize.Op;

const createReview = async (req, res) => {
  const { reviewsData } = req.body;
  const userId = req.user ? req.user.id : null;
  const sessionId = req.sessionId || null;

  try {
    const reviewsToCreate = reviewsData.map((review) => ({
      order_item_id: review.order_item_id,
      rating: review.rating,
      comment_text: review.comment,
      product_id: review.product_id,
      user_id: userId,
      session_id: sessionId,
    }));

    const createdReviews = await Review.bulkCreate(reviewsToCreate);

    return res.status(201).json({
      message: "Đánh giá đã được gửi thành công!",
      data: createdReviews,
    });
  } catch (error) {
    console.error("Lỗi khi tạo đánh giá:", error);
    return res
      .status(500)
      .json({ message: "Lỗi máy chủ nội bộ khi tạo đánh giá." });
  }
};

const getReviews = async (req, res) => {
  const productId = req.query.productId;
  try {
    const reviews = await Review.findAll({
      where: {
        product_id: productId,
      },

      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "full_name", "avatar"],
        },
        {
          model: OrderItem,
          as: "order_item",
          attributes: ["order_item_id"],
          include: [
            {
              model: Order,
              as: "order",
              attributes: ["updated_at"],
            },
          ],
        },
      ],

      order: [["created_at", "DESC"]],
    });

    if (reviews.length === 0) {
      return res.status(404).json([]);
    }

    return res.status(200).json(reviews);
  } catch (error) {
    console.error("Lỗi khi lấy đánh giá:", error);
  }
};

module.exports = { createReview, getReviews };
