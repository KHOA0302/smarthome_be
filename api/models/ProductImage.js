module.exports = (sequelize, Sequelize) => {
  const ProductImage = sequelize.define(
    "productimages",
    {
      img_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      image_url: {
        type: Sequelize.STRING(2048),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    },
    {
      timestamps: false,
      tableName: "productimages",
      underscored: true,
    }
  );

  // Định nghĩa hàm associate
  ProductImage.associate = (db) => {
    // Mối quan hệ ProductImage thuộc về một Product
    // (Từ index.js: db.ProductImage.belongsTo(db.Product, { foreignKey: "product_id", as: "product", });)
    ProductImage.belongsTo(db.Product, {
      foreignKey: "product_id",
      as: "product",
    });
  };

  return ProductImage;
};
