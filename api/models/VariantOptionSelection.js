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

  VariantOptionSelection.associate = (db) => {
    VariantOptionSelection.belongsTo(db.ProductVariant, {
      foreignKey: "variant_id",
      as: "productVariant",
    });

    VariantOptionSelection.belongsTo(db.OptionValue, {
      foreignKey: "option_value_id",
      as: "optionValue",
    });
  };

  return VariantOptionSelection;
};
