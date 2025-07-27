module.exports = (sequelize, Sequelize) => {
  const OrderItemService = sequelize.define(
    "orderitemservices",
    {
      order_item_service_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      package_service_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: "0.00",
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

  OrderItemService.associate = (db) => {
    OrderItemService.belongsTo(db.OrderItem, {
      foreignKey: "order_item_id",
      as: "orderItem",
    });

    OrderItemService.belongsTo(db.PackageServiceItem, {
      foreignKey: "package_service_item_id",
      as: "packageServiceItem",
    });
  };

  return OrderItemService;
};
