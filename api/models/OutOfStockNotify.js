module.exports = (sequelize, Sequelize) => {
  const OutOfStockNotify = sequelize.define(
    "out_of_stock_notify",
    {
      alert_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      variant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      variant_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },

      status: {
        type: Sequelize.ENUM("NEW", "VIEWED", "RESOLVED", "DELETED_MANUALLY"),
        allowNull: false,
        defaultValue: "NEW",
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    },
    {
      timestamps: false,
      tableName: "out_of_stock_notify",
    }
  );

  OutOfStockNotify.associate = (db) => {
    OutOfStockNotify.belongsTo(db.ProductVariant, {
      foreignKey: "variant_id",
      as: "variant",
      onDelete: "CASCADE",
    });
  };

  return OutOfStockNotify;
};
