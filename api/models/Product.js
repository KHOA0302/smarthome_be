module.exports = (sequelize, Sequelize) => {
  const Product = sequelize.define(
    "products", // Tên bảng trong database
    {
      product_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_name: {
        type: Sequelize.STRING, // Tương ứng với VARCHAR
        allowNull: false, // Giả sử product_name không được phép null
      },
      brand_id: {
        type: Sequelize.INTEGER, // Tương ứng với INT
        allowNull: false, // Giả sử brand_id không được phép null (khóa ngoại)
      },
      category_id: {
        type: Sequelize.INTEGER, // Tương ứng với INT
        allowNull: false, // Giả sử category_id không được phép null (khóa ngoại)
      },

      is_active: {
        type: Sequelize.BOOLEAN, // Tương ứng với TINYINT(1) cho boolean
        allowNull: false, // Giả sử is_active không được phép null
        defaultValue: true, // Thường là true cho sản phẩm đang hoạt động
      },
      // Lưu ý: Sequelize có thể tự động quản lý created_at và updated_at nếu timestamps: true
      // Tuy nhiên, vì chúng được định nghĩa rõ ràng trong schema, chúng ta sẽ định nghĩa chúng.
      created_at: {
        type: Sequelize.DATE, // Tương ứng với TIMESTAMP
        allowNull: false,
        defaultValue: Sequelize.NOW, // Thường là thời gian hiện tại khi tạo
      },
      updated_at: {
        type: Sequelize.DATE, // Tương ứng với TIMESTAMP
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      timestamps: false, // Chúng ta sẽ tự định nghĩa created_at và updated_at
      tableName: "products", // Đảm bảo tên bảng là 'products'
      // Để Sequelize tự động cập nhật updated_at khi một bản ghi được cập nhật,
      // bạn có thể sử dụng hooks hoặc kích hoạt `timestamps: true` và đổi tên cột
      // Nhưng theo schema hiện tại, chúng ta sẽ quản lý thủ công hoặc dùng hooks.
      // Một cách khác là để timestamps: true và config createdAt: 'created_at', updatedAt: 'updated_at'
      // Tuy nhiên, với schema hiện tại, cách định nghĩa tường minh này là trực tiếp nhất.
    }
  );

  // Quan hệ:
  // Một Product thuộc về một Brand
  // Một Product thuộc về một Category
  // Bạn sẽ cần định nghĩa các mối quan hệ này trong file index.js (hoặc file tổng hợp các model)
  // Ví dụ:
  // db.products.belongsTo(db.brands, { foreignKey: "brand_id", as: "brand" });
  // db.products.belongsTo(db.categories, { foreignKey: "category_id", as: "category" });

  return Product;
};
