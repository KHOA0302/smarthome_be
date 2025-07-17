module.exports = (sequelize, Sequelize) => {
  const VariantOptionSelection = sequelize.define(
    "variantoptionselections",
    {
      variant_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      option_value_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
    },
    {
      timestamps: false,
      tableName: "variantoptionselections",
    }
  );

  // Định nghĩa hàm associate
  VariantOptionSelection.associate = (db) => {
    // Mối quan hệ VariantOptionSelection thuộc về một ProductVariant
    // (Từ index.js: db.VariantOptionSelection.belongsTo(db.ProductVariant, { foreignKey: "variant_id", as: "productVariant", });)
    VariantOptionSelection.belongsTo(db.ProductVariant, {
      foreignKey: "variant_id",
      as: "productVariant",
    });

    // Mối quan hệ VariantOptionSelection thuộc về một OptionValue
    // (Từ index.js: db.VariantOptionSelection.belongsTo(db.OptionValue, { foreignKey: "option_value_id", as: "optionValue", });)
    VariantOptionSelection.belongsTo(db.OptionValue, {
      foreignKey: "option_value_id",
      as: "optionValue",
    });
  };

  return VariantOptionSelection;
};
