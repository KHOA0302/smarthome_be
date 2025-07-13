// models/service.model.js
module.exports = (sequelize, Sequelize) => {
  const Service = sequelize.define(
    "services", // Tên bảng trong database
    {
      service_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false, // Dựa trên convention service_id là PK và tự tăng nên không thể null
      },
      service_name: {
        type: Sequelize.STRING(255), // VARCHAR(255) từ Type trong ảnh
        allowNull: false,
        unique: true, // Thêm ràng buộc UNIQUE như đã thảo luận
      },
      description: {
        type: Sequelize.TEXT, // TEXT từ Type trong ảnh
        allowNull: true, // TEXT thường cho phép NULL
      },
      category_id: {
        type: Sequelize.INTEGER, // INT từ Type trong ảnh
        allowNull: true, // category_id có thể NULL nếu dịch vụ là chung
      },
      created_at: {
        type: Sequelize.DATE, // TIMESTAMP từ Type trong ảnh
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE, // TIMESTAMP từ Type trong ảnh
        allowNull: false,
        defaultValue: Sequelize.NOW,
        onUpdate: Sequelize.NOW, // Tự động cập nhật khi có thay đổi
      },
    },
    {
      timestamps: false, // Sequelize sẽ không tự động quản lý created_at/updated_at. Chúng ta tự định nghĩa.
      tableName: "services", // Đảm bảo tên bảng khớp với SQL
    }
  );

  // Định nghĩa mối quan hệ với Category (nếu bạn đã có model Category)
  Service.associate = (models) => {
    Service.belongsTo(models.Category, {
      foreignKey: "category_id",
      as: "category",
    });
  };

  return Service;
};
