module.exports = (sequelize, Sequelize) => {
  const ProductVariant = sequelize.define(
    "productvariants",
    {
      variant_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      variant_sku: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      variant_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      stock_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      image_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      item_status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "in_stock",
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
      },
    },
    {
      timestamps: false,
      tableName: "productvariants",
    }
  );

  ProductVariant.associate = (db) => {
    ProductVariant.belongsTo(db.Product, {
      foreignKey: "product_id",
      as: "product",
    });

    ProductVariant.belongsToMany(db.OptionValue, {
      through: db.VariantOptionSelection,
      foreignKey: "variant_id",
      otherKey: "option_value_id",
      as: "selectedOptionValues",
    });

    ProductVariant.hasMany(db.ServicePackage, {
      foreignKey: "variant_id",
      as: "servicePackages",
    });

    ProductVariant.hasMany(db.VariantOptionSelection, {
      foreignKey: "variant_id",
      as: "variantOptionSelections",
    });

    ProductVariant.hasMany(db.CartItem, {
      foreignKey: "variant_id",
      as: "cartItems",
    });

    ProductVariant.hasMany(db.OrderItem, {
      foreignKey: "variant_id",
      as: "OrderItems",
    });
  };

  return ProductVariant;
};
