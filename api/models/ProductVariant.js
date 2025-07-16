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

  return ProductVariant;
};
