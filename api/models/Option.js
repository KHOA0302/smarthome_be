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

  // Định nghĩa hàm associate
  Option.associate = (db) => {
    // Mối quan hệ Option thuộc về một Category
    // (Từ index.js: db.Option.belongsTo(db.Category, { foreignKey: "category_id", as: "category", });)
    Option.belongsTo(db.Category, {
      foreignKey: "category_id",
      as: "category",
    });

    // Mối quan hệ Option có nhiều OptionValue
    // (Từ index.js: db.Option.hasMany(db.OptionValue, { foreignKey: "option_id", as: "optionValues", });)
    Option.hasMany(db.OptionValue, {
      foreignKey: "option_id",
      as: "optionValues",
    });
  };

  return Option;
};
