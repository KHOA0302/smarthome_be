module.exports = (sequelize, Sequelize) => {
  const ProductEvent = sequelize.define(
    "product_events",
    {
      event_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      event_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      event_type: {
        type: Sequelize.ENUM("view", "add_to_cart"),
        allowNull: false,
      },
      variant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "productvariants",
          key: "variant_id",
        },
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      price_at_event: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      referrer: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      utm_source: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      utm_medium: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    },
    {
      timestamps: false,
      tableName: "product_events",
    }
  );

  ProductEvent.associate = (db) => {
    ProductEvent.belongsTo(db.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    ProductEvent.belongsTo(db.ProductVariant, {
      foreignKey: "variant_id",
      as: "variant",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  };

  return ProductEvent;
};
