// models/AttributeGroup.js
module.exports = (sequelize, Sequelize) => {
  const AttributeGroup = sequelize.define(
    "attributegroups", // Tên model
    {
      group_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      group_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: false, // Bảng này không có createdAt/updatedAt
      tableName: "attributegroups", // Đảm bảo tên bảng khớp chính xác trong DB
    }
  );

  AttributeGroup.associate = (db) => {
    console.log("--- Inside AttributeGroup.associate ---");
    console.log(`AttributeGroup.name: ${AttributeGroup.name}`); // Expected: attributegroups
    console.log(
      `Attempting AttributeGroup.belongsTo(db.Category) with db.Category.name: ${
        db.Category ? db.Category.name : "UNDEFINED"
      }`
    );
    AttributeGroup.belongsTo(db.Category, {
      foreignKey: "category_id",
      as: "category",
    });
    console.log("AttributeGroup.belongsTo(db.Category) defined.");

    console.log(
      `Attempting AttributeGroup.hasMany(db.ProductAttribute) with db.ProductAttribute.name: ${
        db.ProductAttribute ? db.ProductAttribute.name : "UNDEFINED"
      }`
    );
    AttributeGroup.hasMany(db.ProductAttribute, {
      foreignKey: "group_id",
      as: "productAttributes",
    });
    console.log("AttributeGroup.hasMany(db.ProductAttribute) defined.");
  };

  return AttributeGroup;
};
