module.exports = (sequelize, Sequelize) => {
  const Product = sequelize.define(
    "products",
    {
      product_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      brand_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sale_volume: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: "products",
    }
  );

  Product.associate = (db) => {
    Product.belongsTo(db.Brand, {
      foreignKey: "brand_id",
      as: "brand",
    });

    Product.belongsTo(db.Category, {
      foreignKey: "category_id",
      as: "category",
    });

    Product.hasMany(db.ProductVariant, {
      foreignKey: "product_id",
      as: "variants",
    });

    Product.hasMany(db.ProductImage, {
      foreignKey: "product_id",
      as: "product_images",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Product.hasMany(db.ProductSpecification, {
      foreignKey: "product_id",
      as: "specifications",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Product;
};
