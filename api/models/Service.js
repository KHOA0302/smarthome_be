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

  // Định nghĩa hàm associate
  Service.associate = (db) => {
    // Thay đổi 'models' thành 'db' để nhất quán
    // Mối quan hệ Service thuộc về một Category
    // (Từ index.js: db.Service.belongsTo(db.Category, { foreignKey: "category_id", as: "serviceCategory", });)
    Service.belongsTo(db.Category, {
      foreignKey: "category_id",
      as: "category", // Đã cập nhật alias theo file index.js ban đầu của bạn
    });

    // Mối quan hệ Service có nhiều PackageServiceItem
    // (Từ index.js: db.Service.hasMany(db.PackageServiceItem, { foreignKey: "service_id", as: "packageServiceItems", });)
    Service.hasMany(db.PackageServiceItem, {
      foreignKey: "service_id",
      as: "packageServiceItems",
    });
  };
  return Service;
};
