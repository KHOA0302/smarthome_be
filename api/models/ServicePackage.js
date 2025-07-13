// models/servicePackage.model.js
module.exports = (sequelize, Sequelize) => {
  const ServicePackage = sequelize.define(
    "servicepackages", // Tên bảng trong database
    {
      package_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false, // Dựa trên convention service_id là PK và tự tăng nên không thể null
      },
      product_id: {
        type: Sequelize.INTEGER, // INT từ Type trong ảnh
        allowNull: false,
      },
      package_name: {
        type: Sequelize.STRING(255), // VARCHAR từ Type trong ảnh
        allowNull: false,
      },
      is_default: {
        type: Sequelize.BOOLEAN, // TINYINT từ Type trong ảnh, Sequelize ánh xạ thành BOOLEAN
        allowNull: true, // Có thể null hoặc có giá trị mặc định tùy vào logic
      },
      display_order: {
        type: Sequelize.INTEGER, // INT từ Type trong ảnh
        allowNull: true, // Có thể null
      },
      description: {
        type: Sequelize.TEXT, // TEXT từ Type trong ảnh
        allowNull: true, // Có thể null
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
      timestamps: false, // Tắt timestamps tự động của Sequelize vì chúng ta tự định nghĩa created_at/updated_at
      tableName: "servicepackages", // Đảm bảo tên bảng khớp với SQL
      indexes: [
        {
          unique: true,
          fields: ["product_id", "package_name"], // Ràng buộc duy nhất như đã thảo luận
        },
      ],
    }
  );

  return ServicePackage;
};
