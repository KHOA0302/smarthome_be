module.exports = (sequelize, Sequelize) => {
  const Role = sequelize.define(
    "roles",
    {
      role_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      role_name: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: false,
    }
  );
  return Role;
};
