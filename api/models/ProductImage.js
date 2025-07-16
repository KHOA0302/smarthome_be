module.exports = (sequelize, Sequelize) => {
  const ProductImage = sequelize.define(
    "productimages", // Tên bảng trong database, phải khớp chính xác
    {
      img_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // Nếu bạn muốn định nghĩa khóa ngoại ngay tại đây
        // references: {
        //   model: 'products', // Tên bảng mà ProductImage tham chiếu đến
        //   key: 'product_id', // Tên cột khóa chính trong bảng 'products'
        // }
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: true, // Cho phép NULL theo cấu trúc bảng
      },
      image_url: {
        type: Sequelize.STRING(2048), // VARCHAR(2048) theo cấu trúc bảng
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE, // DATETIME theo cấu trúc bảng
        allowNull: false,
        // defaultValue: Sequelize.NOW, // Nếu bạn muốn Sequelize tự động thêm
      },
      updated_at: {
        type: Sequelize.DATE, // DATETIME theo cấu trúc bảng
        allowNull: false,
        // defaultValue: Sequelize.NOW, // Nếu bạn muốn Sequelize tự động thêm
      },
    },
    {
      timestamps: false, // Bạn đã có created_at và updated_at được quản lý bởi DB, nên đặt là false
      tableName: "productimages", // Đảm bảo tên bảng là 'productimages' (chữ thường, số nhiều)
      underscored: true, // Đặt là true nếu các cột trong DB của bạn dùng snake_case (ví dụ: product_id, created_at)
    }
  );

  // Quan hệ (Associations) sẽ được định nghĩa trong models/index.js theo cách bạn muốn.
  // Ví dụ (dành cho models/index.js):
  // db.ProductImage.belongsTo(db.Product, {
  //   foreignKey: "product_id",
  //   as: "product",
  //   onDelete: 'CASCADE',
  //   onUpdate: 'CASCADE'
  // });
  // db.Product.hasMany(db.ProductImage, {
  //   foreignKey: "product_id",
  //   as: "product_images",
  //   onDelete: 'CASCADE',
  //   onUpdate: 'CASCADE'
  // });

  return ProductImage;
};
