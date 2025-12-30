const db = require("../models/index");
const { ProductVariant, Promotion, PromotionVariant, Sequelize, sequelize } =
  db;

const createPromotion = async (req, res) => {
  const { promotion, promotionVariants } = req.body;
  const newPromotionData = {
    promotion_name: promotion.name,
    discount_value: parseFloat(promotion.discount),
    is_active: true,
  };
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const newPromotion = await Promotion.create(newPromotionData, {
      transaction,
    });

    const promotionId = newPromotion.promotion_id;

    const promotionVariantRecords = promotionVariants.map((variantId) => ({
      promotion_id: promotionId,
      variant_id: variantId,
    }));

    await PromotionVariant.bulkCreate(promotionVariantRecords, { transaction });
    await transaction.commit();

    return res.status(201).json({
      message: "Tạo đợt giảm giá thành công.",
      promotion: newPromotion,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Lỗi khi tạo Promotion:", error);
    return res
      .status(500)
      .json({ message: "Lỗi nội bộ máy chủ", error: error.message });
  }
};

const getPromotion = async (req, res) => {
  try {
    const promotions = await Promotion.findAll({
      include: [
        {
          model: PromotionVariant,
          as: "promotionVariants",
          include: [
            {
              model: ProductVariant,
              as: "variant",
              attributes: [
                "product_id",
                "variant_id",
                "variant_name",
                "image_url",
                "price",
                "stock_quantity",
              ],
            },
          ],
        },
      ],
    });

    return res.status(200).json(promotions);
  } catch (error) {
    console.error(error);
  }
};

const deletePromotion = async (req, res) => {
  const { promotionId } = req.params;
  try {
    transaction = await sequelize.transaction();

    const deletedPromotion = await Promotion.destroy({
      where: { promotion_id: promotionId },
      transaction: transaction,
    });

    if (deletedPromotion === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: "Không tìm thấy Đợt Giảm Giá." });
    }
    await transaction.commit();

    return res.status(200).json({
      message: `Xóa thành công.`,
    });
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  createPromotion,
  getPromotion,
  deletePromotion,
};
