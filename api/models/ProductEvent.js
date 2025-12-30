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
      },
      user_id: {
        type: Sequelize.INTEGER,

        references: {
          model: "users",
          key: "user_id",
        },
      },
      session_id: {
        type: Sequelize.STRING(255),
      },
      event_type: {
        type: Sequelize.ENUM(
          "view",
          "add_to_cart",
          "purchase",
          "remove_from_cart "
        ),
        allowNull: false,
      },
      variant_id: {
        type: Sequelize.INTEGER,
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
      },
      click_counting: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      referrer: {
        type: Sequelize.STRING(255),
      },
      utm_source: {
        type: Sequelize.STRING(100),
      },
      utm_medium: {
        type: Sequelize.STRING(100),
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
