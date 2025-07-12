module.exports = (sequelize, Sequelize) => {
  const OptionValue = sequelize.define(
    "optionvalues", // Tên bảng trong database
    {
      option_value_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      option_id: {
        type: Sequelize.INTEGER, // Tương ứng với INT
        allowNull: false, // Giả sử option_id không được phép null (vì đây là khóa ngoại)
      },
      option_value_name: {
        type: Sequelize.STRING, // Tương ứng với VARCHAR
        allowNull: false, // Giả sử option_value_name không được phép null
      },
    },
    {
      timestamps: false, // Giả sử bạn không muốn Sequelize tự động thêm createdAt và updatedAt
      tableName: "optionvalues", // Đảm bảo tên bảng là 'optionvalues'
    }
  );

  // Quan hệ: Một OptionValue thuộc về một Option
  // Bạn sẽ cần định nghĩa mối quan hệ này trong file index.js (hoặc file tổng hợp các model)
  // Ví dụ:
  // db.optionvalues.belongsTo(db.options, {
  //   foreignKey: "option_id",
  //   targetKey: "option_id", // Optional, if foreign key name is different from target table's primary key
  //   as: "option"
  // });

  return OptionValue;
};
