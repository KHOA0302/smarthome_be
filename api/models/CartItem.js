module.exports = (sequelize, Sequelize) => {
  const CartItem = sequelize.define(
    "cartitems",
    {
      cart_item_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cart_id: {
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
        defaultValue: 1,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
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

  CartItem.associate = (db) => {
    CartItem.belongsTo(db.Cart, {
      foreignKey: "cart_id",
      as: "cart",
    });

    CartItem.belongsTo(db.ProductVariant, {
      foreignKey: "variant_id",
      as: "productVariant",
    });

    CartItem.hasMany(db.CartItemService, {
      foreignKey: "cart_item_id",
      as: "cartItemServices",
    });
  };

  return CartItem;
};
