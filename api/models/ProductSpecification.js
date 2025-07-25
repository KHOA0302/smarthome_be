module.exports = (sequelize, Sequelize) => {
  const ProductSpecification = sequelize.define(
    "ProductSpecification",
    {
      specification_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      attribute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      attribute_value: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
    },
    {
      timestamps: false,
      tableName: "productspecifications",
    }
  );

  ProductSpecification.associate = (db) => {
    ProductSpecification.belongsTo(db.Product, {
      foreignKey: "product_id",
      as: "product",
    });
    ProductSpecification.belongsTo(db.ProductAttribute, {
      foreignKey: "attribute_id",
      as: "productAttribute",
    });
  };

  return ProductSpecification;
};
