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

  return Option;
};
