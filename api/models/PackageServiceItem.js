// models/packageServiceItem.model.js
module.exports = (sequelize, Sequelize) => {
  const PackageServiceItem = sequelize.define(
    "packageserviceitems", // Tên bảng trong database
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
      // ĐÃ ĐƯA LẠI: item_price_impact
      item_price_impact: {
        type: Sequelize.DECIMAL(10, 2), // DECIMAL từ Type trong ảnh, để lưu giá trị tiền tệ
        allowNull: false,
      },
      atLeastOne: {
        type: Sequelize.BOOLEAN, // TINYINT trong SQL, ánh xạ thành BOOLEAN
        allowNull: false,
        defaultValue: false, // Mặc định là không cố định (có thể bỏ chọn)
      },
      selectable: {
        type: Sequelize.BOOLEAN, // TINYINT trong SQL, ánh xạ thành BOOLEAN
        allowNull: false,
        defaultValue: true, // Mặc định là được chọn ban đầu
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
        onUpdate: Sequelize.NOW, // Tự động cập nhật khi có thay đổi
      },
    },
    {
      timestamps: false, // Tắt timestamps tự động của Sequelize
      tableName: "packageserviceitems", // Đảm bảo tên bảng khớp với SQL
      indexes: [
        {
          unique: true,
          fields: ["package_id", "service_id"], // Mỗi dịch vụ chỉ xuất hiện một lần trong một gói
        },
      ],
    }
  );

  return PackageServiceItem;
};
