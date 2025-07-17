// models/ProductAttribute.js
module.exports = (sequelize, Sequelize) => {
  const ProductAttribute = sequelize.define(
    "ProductAttribute", // Tên model (PascalCase, số ít)
    {
      attribute_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      attribute_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
      },
      is_filterable: {
        type: Sequelize.TINYINT, // TINYINT thường được ánh xạ thành BOOLEAN trong Sequelize, nhưng TINYINT cũng có thể dùng
        allowNull: false,
        defaultValue: 0, // Giá trị mặc định cho TINYINT
      },
      group_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      unit: {
        type: Sequelize.STRING(50),
      },
    },
    {
      timestamps: false, // Bảng này không có createdAt/updatedAt
      tableName: "productattributes", // Đảm bảo tên bảng khớp chính xác trong DB
    }
  );

  ProductAttribute.associate = (db) => {
    console.log("--- Inside ProductAttribute.associate ---");
    console.log(`ProductAttribute.name: ${ProductAttribute.name}`); // Expected: ProductAttribute
    console.log(
      `Attempting ProductAttribute.belongsTo(db.AttributeGroup) with db.AttributeGroup.name: ${
        db.AttributeGroup ? db.AttributeGroup.name : "UNDEFINED"
      }`
    );
    ProductAttribute.belongsTo(db.AttributeGroup, {
      foreignKey: "group_id",
      as: "attributeGroup",
    });
    console.log("ProductAttribute.belongsTo(db.AttributeGroup) defined.");
  };

  return ProductAttribute;
};
