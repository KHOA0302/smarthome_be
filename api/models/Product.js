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

  // Định nghĩa hàm associate
  Product.associate = (db) => {
    // Mối quan hệ Product thuộc về một Brand
    // (Từ index.js: db.Product.belongsTo(db.Brand, { foreignKey: "brand_id", as: "brand", });)
    Product.belongsTo(db.Brand, {
      foreignKey: "brand_id",
      as: "brand",
    });

    // Mối quan hệ Product thuộc về một Category
    // (Từ index.js: db.Product.belongsTo(db.Category, { foreignKey: "category_id", as: "category", });)
    Product.belongsTo(db.Category, {
      foreignKey: "category_id",
      as: "category",
    });

    // Mối quan hệ Product có nhiều ProductVariant
    // (Từ index.js: db.Product.hasMany(db.ProductVariant, { foreignKey: "product_id", as: "variants", });)
    Product.hasMany(db.ProductVariant, {
      foreignKey: "product_id",
      as: "variants",
    });

    // Mối quan hệ Product có nhiều ProductImage
    // (Từ index.js: db.Product.hasMany(db.ProductImage, { foreignKey: "product_id", as: "product_images", onDelete: "CASCADE", onUpdate: "CASCADE", });)
    Product.hasMany(db.ProductImage, {
      foreignKey: "product_id",
      as: "product_images",
      onDelete: "CASCADE", // Khi Product bị xóa, các product images liên quan cũng bị xóa
      onUpdate: "CASCADE",
    });

    // Mối quan hệ Product có nhiều ProductSpecification
    // (Từ index.js: db.Product.hasMany(db.ProductSpecification, { foreignKey: "product_id", as: "specifications", onDelete: "CASCADE", onUpdate: "CASCADE", });)
    // Product.hasMany(db.ProductSpecification, {
    //   foreignKey: "product_id",
    //   as: "specifications",
    //   onDelete: "CASCADE", // Khi Product bị xóa, các specifications liên quan cũng bị xóa
    //   onUpdate: "CASCADE",
    // });
  };

  return Product;
};
