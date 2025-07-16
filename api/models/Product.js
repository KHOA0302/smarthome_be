module.exports = (sequelize, Sequelize) => {
  const Product = sequelize.define(
    "products",
    {
      product_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      brand_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: "products",
    }
  );

  return Product;
};
