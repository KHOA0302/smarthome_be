// models/servicePackage.model.js
module.exports = (sequelize, Sequelize) => {
  const ServicePackage = sequelize.define(
    "servicepackages",
    {
      package_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      variant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      package_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
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
      tableName: "servicepackages",
      indexes: [
        {
          unique: true,
          fields: ["variant_id", "package_name"],
        },
      ],
    }
  );

  ServicePackage.associate = (db) => {
    ServicePackage.belongsTo(db.ProductVariant, {
      foreignKey: "variant_id",
      as: "productVariant",
    });

    ServicePackage.hasMany(db.PackageServiceItem, {
      foreignKey: "package_id",
      as: "packageItems",
    });
  };

  return ServicePackage;
};
