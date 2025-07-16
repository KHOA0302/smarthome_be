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
  return Category;
};
