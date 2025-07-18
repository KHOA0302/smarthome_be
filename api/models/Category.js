module.exports = (sequelize, Sequelize) => {
  const Category = sequelize.define(
    "categories",
    {
      category_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_name: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
    },
    {
      timestamps: false,
      tableName: "categories",
    }
  );

  Category.associate = (db) => {
    Category.hasMany(db.Product, {
      foreignKey: "category_id",
      as: "products",
    });

    Category.hasMany(db.Option, {
      foreignKey: "category_id",
      as: "options",
    });
    Category.hasMany(db.Service, {
      foreignKey: "category_id",
      as: "services",
    });
    Category.hasMany(db.AttributeGroup, {
      foreignKey: "category_id",
      as: "attributeGroups",
    });
  };

  return Category;
};
