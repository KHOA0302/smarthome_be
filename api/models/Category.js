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

  // Định nghĩa hàm associate
  Category.associate = (db) => {
    // Mối quan hệ Category có nhiều Product
    // (Từ index.js: db.Category.hasMany(db.Product, { foreignKey: "category_id", as: "products", });)
    Category.hasMany(db.Product, {
      foreignKey: "category_id",
      as: "products",
    });

    // Mối quan hệ Category có nhiều Option
    // (Từ index.js: db.Category.hasMany(db.Option, { foreignKey: "category_id", as: "options", });)
    Category.hasMany(db.Option, {
      foreignKey: "category_id",
      as: "options",
    });

    // Mối quan hệ Category có nhiều Service
    // (Từ index.js: db.Category.hasMany(db.Service, { foreignKey: "category_id", as: "services", });)
    Category.hasMany(db.Service, {
      foreignKey: "category_id",
      as: "services",
    });

    // Mối quan hệ giữa Category và AttributeGroup
    // (Từ index.js: db.Category.hasMany(db.AttributeGroup, { foreignKey: "category_id", as: "attributeGroups", });)
    Category.hasMany(db.AttributeGroup, {
      foreignKey: "category_id",
      as: "attributeGroups",
    });
  };

  return Category;
};
