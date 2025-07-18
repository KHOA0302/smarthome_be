module.exports = (sequelize, Sequelize) => {
  const Option = sequelize.define(
    "options",
    {
      option_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      option_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_filterable: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: false,
      tableName: "options",
    }
  );

  Option.associate = (db) => {
    Option.belongsTo(db.Category, {
      foreignKey: "category_id",
      as: "category",
    });

    Option.hasMany(db.OptionValue, {
      foreignKey: "option_id",
      as: "optionValues",
    });
  };

  return Option;
};
