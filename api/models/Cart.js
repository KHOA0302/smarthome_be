module.exports = (sequelize, Sequelize) => {
  const Cart = sequelize.define(
    "carts",
    {
      cart_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
      },
      session_id: {
        type: Sequelize.STRING,
        unique: true,
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

  Cart.associate = (db) => {
    Cart.belongsTo(db.User, {
      foreignKey: "user_id",
      as: "user",
    });

    Cart.hasMany(db.CartItem, {
      foreignKey: "cart_id",
      as: "cartItems",
      onDelete: "CASCADE",
    });
  };

  return Cart;
};
