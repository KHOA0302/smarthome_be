module.exports = (sequelize, Sequelize) => {
  const OrderItem = sequelize.define(
    "orderitems",
    {
      order_item_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      variant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      total_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
    },
    {
      timestamps: false,
    }
  );

  OrderItem.associate = (db) => {
    OrderItem.belongsTo(db.Order, {
      foreignKey: "order_id",
      as: "order",
    });

    OrderItem.belongsTo(db.ProductVariant, {
      foreignKey: "variant_id",
      as: "productVariant",
    });

    OrderItem.hasMany(db.OrderItemService, {
      foreignKey: "order_item_id",
      as: "orderItemServices",
    });

    OrderItem.hasOne(db.Review, {
      foreignKey: "order_item_id",
      as: "reviews",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  };

  return OrderItem;
};
