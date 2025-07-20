module.exports = (sequelize, Sequelize) => {
  const ProductAttribute = sequelize.define(
    "ProductAttribute",
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
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
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
      timestamps: false,
      tableName: "productattributes",
    }
  );

  ProductAttribute.associate = (db) => {
    ProductAttribute.belongsTo(db.AttributeGroup, {
      foreignKey: "group_id",
      as: "attributegroups",
    });

    ProductAttribute.hasMany(db.ProductSpecification, {
      foreignKey: "attribute_id",
      as: "productspecifications",
      onDelete: "CASCADE", // Thêm dòng này
      onUpdate: "CASCADE", // Thêm dòng này
    });
  };

  return ProductAttribute;
};
