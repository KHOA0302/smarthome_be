module.exports = (sequelize, Sequelize) => {
  const Category = sequelize.define(
    "categories", // Tên bảng trong database
    {
      category_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_name: {
        type: Sequelize.STRING, // Tương ứng với VARCHAR
        unique: true, // Thường category_name là duy nhất
        allowNull: false, // Giả sử category_name không được phép null
      },
      display_order: {
        type: Sequelize.INTEGER, // Tương ứng với INT
        allowNull: true, // Giả sử display_order có thể null
      },
    },
    {
      timestamps: false, // Giả sử bạn không muốn Sequelize tự động thêm createdAt và updatedAt
      tableName: "categories", // Đảm bảo tên bảng là 'categories'
    }
  );
  return Category;
};
