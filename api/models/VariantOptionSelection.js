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

      indexes: [
        {
          unique: true,
          fields: ["variant_id", "option_value_id"],
        },
      ],
    }
  );

  return VariantOptionSelection;
};
