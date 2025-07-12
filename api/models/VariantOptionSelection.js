module.exports = (sequelize, Sequelize) => {
  const VariantOptionSelection = sequelize.define(
    "variantoptionselections", // Tên bảng trong database
    {
      variant_id: {
        type: Sequelize.INTEGER,
        primaryKey: true, // Kết hợp với option_value_id để tạo khóa chính kép
        allowNull: false, // Không được phép null (khóa ngoại)
      },
      option_value_id: {
        type: Sequelize.INTEGER,
        primaryKey: true, // Kết hợp với variant_id để tạo khóa chính kép
        allowNull: false, // Không được phép null (khóa ngoại)
      },
    },
    {
      timestamps: false, // Bảng trung gian thường không cần timestamps
      tableName: "variantoptionselections", // Đảm bảo tên bảng là 'variantoptionselections'
      // Để Sequelize biết đây là khóa chính kép, bạn có thể thêm thuộc tính indexes hoặc chỉ định combine primaryKey
      // Tuy nhiên, với 2 trường là primaryKey: true, Sequelize sẽ tự động tạo khóa chính kép.
      // unique: true sẽ đảm bảo sự kết hợp là duy nhất
      indexes: [
        {
          unique: true,
          fields: ["variant_id", "option_value_id"],
        },
      ],
    }
  );

  // Quan hệ Many-to-Many
  // Bạn sẽ cần định nghĩa mối quan hệ này trong file index.js (hoặc file tổng hợp các model)
  // Ví dụ:
  // db.productvariants.belongsToMany(db.optionvalues, {
  //   through: db.variantoptionselections,
  //   foreignKey: "variant_id",
  //   otherKey: "option_value_id",
  //   as: "selectedOptions"
  // });
  //
  // db.optionvalues.belongsToMany(db.products, { // Hoặc db.productvariants tùy thuộc vào ngữ cảnh chính
  //   through: db.variantoptionselections,
  //   foreignKey: "option_value_id",
  //   otherKey: "variant_id",
  //   as: "variants"
  // });

  return VariantOptionSelection;
};
