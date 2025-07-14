// models/servicePackage.model.js
module.exports = (sequelize, Sequelize) => {
  const ServicePackage = sequelize.define(
    "servicepackages", // Tên bảng trong database
    {
      package_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      // THAY ĐỔI LỚN: Bây giờ liên kết với variant_id
      variant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      package_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      is_default: {
        type: Sequelize.BOOLEAN, // Cột này từ hình ảnh, có thể sử dụng để đánh dấu gói mặc định
        allowNull: true,
      },
      display_order: {
        type: Sequelize.INTEGER, // Cột này từ hình ảnh, hữu ích cho thứ tự hiển thị
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
      timestamps: false, // Tắt timestamps tự động của Sequelize (vì đã quản lý thủ công)
      tableName: "servicepackages", // Đảm bảo tên bảng khớp với SQL
      indexes: [
        {
          unique: true,
          fields: ["variant_id", "package_name"], // Đảm bảo tên gói duy nhất cho mỗi biến thể
        },
      ],
    }
  );

  return ServicePackage;
};
