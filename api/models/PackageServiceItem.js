module.exports = (sequelize, Sequelize) => {
  const PackageServiceItem = sequelize.define(
    "packageserviceitems",
    {
      package_service_item_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      package_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      service_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      item_price_impact: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      at_least_one: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      selectable: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: "packageserviceitems",
      indexes: [
        {
          unique: true,
          fields: ["package_id", "service_id"],
        },
      ],
    }
  );

  PackageServiceItem.associate = (db) => {
    PackageServiceItem.belongsTo(db.ServicePackage, {
      foreignKey: "package_id",
      as: "servicePackage",
    });

    PackageServiceItem.belongsTo(db.Service, {
      foreignKey: "service_id",
      as: "serviceDefinition",
    });
  };

  return PackageServiceItem;
};
