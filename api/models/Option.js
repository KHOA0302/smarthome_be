module.exports = (sequelize, Sequelize) => {
  const Option = sequelize.define(
    "options", // Tên bảng trong database
    {
      option_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      option_name: {
        type: Sequelize.STRING, // Tương ứng với VARCHAR
        allowNull: false, // Giả sử option_name không được phép null
      },
      is_filterable: {
        type: Sequelize.BOOLEAN, // Tương ứng với TINYINT(1) cho boolean
        allowNull: false, // Giả sử is_filterable không được phép null
        defaultValue: false, // Giá trị mặc định, nếu có
      },
      category_id: {
        type: Sequelize.INTEGER, // Tương ứng với INT
        allowNull: false, // Giả sử category_id không được phép null (vì đây có thể là khóa ngoại)
      },
    },
    {
      timestamps: false, // Giả sử bạn không muốn Sequelize tự động thêm createdAt và updatedAt
      tableName: "options", // Đảm bảo tên bảng là 'options'
    }
  );

  return Option;
};
