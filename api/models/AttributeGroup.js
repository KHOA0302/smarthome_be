module.exports = (sequelize, Sequelize) => {
  const AttributeGroup = sequelize.define(
    "attributegroups",
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
      timestamps: false,
      tableName: "attributegroups",
    }
  );

  AttributeGroup.associate = (db) => {
    AttributeGroup.belongsTo(db.Category, {
      foreignKey: "category_id",
      as: "category",
    });

    AttributeGroup.hasMany(db.ProductAttribute, {
      foreignKey: "group_id",
      as: "productattributes",
    });
  };

  return AttributeGroup;
};
