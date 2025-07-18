module.exports = (sequelize, Sequelize) => {
  const OptionValue = sequelize.define(
    "optionvalues",
    {
      option_value_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      option_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      option_value_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    },
    {
      timestamps: false,
      tableName: "optionvalues",
    }
  );

  OptionValue.associate = (db) => {
    OptionValue.belongsTo(db.Option, {
      foreignKey: "option_id",
      as: "option",
    });

    OptionValue.belongsToMany(db.ProductVariant, {
      through: db.VariantOptionSelection,
      foreignKey: "option_value_id",
      otherKey: "variant_id",
      as: "productVariants",
    });

    OptionValue.hasMany(db.VariantOptionSelection, {
      foreignKey: "option_value_id",
      as: "variantOptionSelections",
    });
  };

  return OptionValue;
};
