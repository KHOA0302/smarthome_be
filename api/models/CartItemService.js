module.exports = (sequelize, Sequelize) => {
  const CartItemService = sequelize.define(
    "cartitemservices",
    {
      cart_item_service_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cart_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      package_service_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        onUpdate: Sequelize.NOW,
      },
    },
    {
      timestamps: false,
    }
  );

  CartItemService.associate = (db) => {
    CartItemService.belongsTo(db.CartItem, {
      foreignKey: "cart_item_id",
      as: "cartItem",
    });

    CartItemService.belongsTo(db.PackageServiceItem, {
      foreignKey: "package_service_item_id",
      as: "packageServiceItem",
    });
  };

  return CartItemService;
};
