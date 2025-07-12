module.exports = (sequelize, Sequelize) => {
  const ProductVariant = sequelize.define(
    "productvariants", // Tên bảng trong database
    {
      variant_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.INTEGER, // Tương ứng với INT
        allowNull: false, // Giả sử product_id không được phép null (khóa ngoại)
      },
      variant_sku: {
        type: Sequelize.STRING, // Tương ứng với VARCHAR
        unique: true, // SKUs thường là duy nhất
        allowNull: false, // Giả sử variant_sku không được phép null
      },
      price: {
        type: Sequelize.DECIMAL(10, 2), // Tương ứng với DECIMAL, ví dụ DECIMAL(10, 2) cho 2 số thập phân
        allowNull: false, // Giả sử price không được phép null
      },
      stock_quantity: {
        type: Sequelize.INTEGER, // Tương ứng với INT
        allowNull: false, // Giả sử stock_quantity không được phép null
        defaultValue: 0, // Mặc định là 0 nếu không có số lượng tồn kho ban đầu
      },
      image_url: {
        type: Sequelize.STRING, // Tương ứng với VARCHAR
        allowNull: true, // Giả sử image_url có thể null
      },
      item_status: {
        type: Sequelize.STRING, // Tương ứng với VARCHAR, có thể là 'in_stock', 'out_of_stock', 'limited_stock'
        allowNull: false, // Giả sử item_status không được phép null
        defaultValue: 'in_stock', // Giá trị mặc định phổ biến
      },
      created_at: {
        type: Sequelize.DATE, // Tương ứng với TIMESTAMP
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE, // Tương ứng với TIMESTAMP
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      timestamps: false, // Chúng ta sẽ tự định nghĩa created_at và updated_at
      tableName: 'productvariants', // Đảm bảo tên bảng là 'productvariants'
      // Để updated_at tự động cập nhật, bạn có thể sử dụng hooks hoặc cấu hình `timestamps: true`
    }
  );

  // Quan hệ: Một ProductVariant thuộc về một Product
  // Bạn sẽ cần định nghĩa mối quan hệ này trong file index.js (hoặc file tổng hợp các model)
  // Ví dụ:
  // db.productvariants.belongsTo(db.products, { foreignKey: "product_id", as: "product" });

  return ProductVariant;
};