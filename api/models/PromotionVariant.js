module.exports = (sequelize, Sequelize) => {
  const PromotionVariant = sequelize.define(
    "promotionvariants",
    {
      specific_discount_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
    },
    {
      timestamps: false,
      tableName: "promotionvariants",

      primaryKey: ["promotion_id", "variant_id"],
    }
  );

  PromotionVariant.associate = (db) => {
    PromotionVariant.belongsTo(db.Promotion, {
      foreignKey: "promotion_id",
      as: "promotion",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    PromotionVariant.belongsTo(db.ProductVariant, {
      foreignKey: "variant_id",
      as: "variant",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return PromotionVariant;
};
