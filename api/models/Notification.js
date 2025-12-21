module.exports = (sequelize, Sequelize) => {
  const Notification = sequelize.define(
    "notifications",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      variant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Notification.associate = (db) => {
    Notification.belongsTo(db.ProductVariant, {
      foreignKey: "variant_id",
      as: "variant",
      constraints: false,
    });

    Notification.belongsTo(db.Order, {
      foreignKey: "order_id",
      as: "order",
      constraints: false,
    });
  };

  return Notification;
};
