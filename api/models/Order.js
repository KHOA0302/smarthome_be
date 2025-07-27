module.exports = (sequelize, Sequelize) => {
  const Order = sequelize.define(
    "orders",
    {
      order_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      guest_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      guest_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      guest_province: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      guest_district: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      guest_house_number: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      guest_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      order_total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      order_status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "pending",
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      payment_status: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "unpaid",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

  Order.associate = (db) => {
    Order.belongsTo(db.User, {
      foreignKey: "user_id",
      as: "user",
    });

    Order.hasMany(db.OrderItem, {
      foreignKey: "order_id",
      as: "orderItems",
      onDelete: "CASCADE",
    });
  };

  return Order;
};
