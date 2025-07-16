module.exports = (sequelize, Sequelize) => {
  const Service = sequelize.define(
    "services",
    {
      service_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      service_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        onUpdate: Sequelize.NOW,
      },
    },
    {
      timestamps: false,
      tableName: "services",
    }
  );

  Service.associate = (models) => {
    Service.belongsTo(models.Category, {
      foreignKey: "category_id",
      as: "category",
    });
  };

  return Service;
};
