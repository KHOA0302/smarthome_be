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

  return OptionValue;
};
