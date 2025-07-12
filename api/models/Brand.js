module.exports = (sequelize, Sequelize) => {
  const Brand = sequelize.define(
    "brands",
    {
      brand_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      brand_name: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      logo_url: {
        type: Sequelize.STRING,
      },
      description: {
        type: Sequelize.TEXT,
      },
    },
    {
      timestamps: false,
      tableName: "brands",
    }
  );
  return Brand;
};
