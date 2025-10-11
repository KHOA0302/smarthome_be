module.exports = (sequelize, Sequelize) => {
  const Review = sequelize.define(
    "reviews",
    {
      review_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      order_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      session_id: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },

      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      comment_text: {
        type: Sequelize.TEXT,
        allowNull: true,
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
        onUpdate: Sequelize.NOW,
      },
    },
    {
      tableName: "reviews",
      timestamps: false,
    }
  );

  Review.associate = (db) => {
    Review.belongsTo(db.OrderItem, {
      foreignKey: "order_item_id",
      as: "order_item",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    Review.belongsTo(db.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Review.belongsTo(db.Product, {
      foreignKey: "product_id",
      as: "product",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Review;
};
