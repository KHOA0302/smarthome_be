module.exports = (sequelize, Sequelize) => {
  const Promotion = sequelize.define(
    "promotions",
    {
      promotion_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      promotion_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      discount_type: {
        type: Sequelize.ENUM("PERCENT", "FIXED"),
        defaultValue: "PERCENT",
        allowNull: false,
      },
      discount_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      timestamps: false,
      tableName: "promotions",
    }
  );

  Promotion.associate = (db) => {
    Promotion.belongsToMany(db.ProductVariant, {
      through: db.PromotionVariant,
      foreignKey: "promotion_id",
      otherKey: "variant_id",
      as: "variants",
    });

    Promotion.hasMany(db.PromotionVariant, {
      foreignKey: "promotion_id",
      as: "promotionVariants",
    });
  };

  return Promotion;
};
