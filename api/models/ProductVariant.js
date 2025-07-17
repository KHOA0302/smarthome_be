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

  // Định nghĩa hàm associate
  ProductVariant.associate = (db) => {
    // Mối quan hệ ProductVariant thuộc về một Product
    // (Từ index.js: db.ProductVariant.belongsTo(db.Product, { foreignKey: "product_id", as: "product", });)
    ProductVariant.belongsTo(db.Product, {
      foreignKey: "product_id",
      as: "product",
    });

    // Mối quan hệ ProductVariant nhiều-nhiều với OptionValue thông qua VariantOptionSelection
    // (Từ index.js: db.ProductVariant.belongsToMany(db.OptionValue, { through: db.VariantOptionSelection, foreignKey: "variant_id", otherKey: "option_value_id", as: "selectedOptionValues", });)
    ProductVariant.belongsToMany(db.OptionValue, {
      through: db.VariantOptionSelection,
      foreignKey: "variant_id",
      otherKey: "option_value_id",
      as: "selectedOptionValues",
    });

    // Mối quan hệ ProductVariant có nhiều ServicePackage
    // (Từ index.js: db.ProductVariant.hasMany(db.ServicePackage, { foreignKey: "variant_id", as: "servicePackages", });)
    ProductVariant.hasMany(db.ServicePackage, {
      foreignKey: "variant_id",
      as: "servicePackages",
    });

    // Mối quan hệ ProductVariant có nhiều VariantOptionSelection (nếu cần truy cập trực tiếp bảng trung gian)
    // (Từ index.js: db.VariantOptionSelection.belongsTo(db.ProductVariant, { foreignKey: "variant_id", as: "productVariant", });)
    // Mối quan hệ này đã được xử lý bởi belongsToMany ở trên, nhưng nếu bạn cần truy cập trực tiếp từ VariantOptionSelection, bạn có thể giữ nó.
    // Tuy nhiên, thông thường thì hasMany(VariantOptionSelection) cũng sẽ được đặt ở đây nếu muốn truy cập các bản ghi trung gian từ ProductVariant.
    ProductVariant.hasMany(db.VariantOptionSelection, {
      foreignKey: "variant_id",
      as: "variantOptionSelections", // Đặt tên alias rõ ràng hơn
    });
  };

  return ProductVariant;
};
