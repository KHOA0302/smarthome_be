module.exports = (sequelize, Sequelize) => {
  const OptionValue = sequelize.define(
    "optionvalues",
    {
      option_value_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      option_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      option_value_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    },
    {
      timestamps: false,
      tableName: "optionvalues",
    }
  );

  // Định nghĩa hàm associate
  OptionValue.associate = (db) => {
    // Mối quan hệ OptionValue thuộc về một Option
    // (Từ index.js: db.OptionValue.belongsTo(db.Option, { foreignKey: "option_id", as: "option", });)
    OptionValue.belongsTo(db.Option, {
      foreignKey: "option_id",
      as: "option",
    });

    // Mối quan hệ OptionValue nhiều-nhiều với ProductVariant thông qua VariantOptionSelection
    // (Từ index.js: db.OptionValue.belongsToMany(db.ProductVariant, { through: db.VariantOptionSelection, foreignKey: "option_value_id", otherKey: "variant_id", as: "productVariants", });)
    OptionValue.belongsToMany(db.ProductVariant, {
      through: db.VariantOptionSelection,
      foreignKey: "option_value_id",
      otherKey: "variant_id",
      as: "productVariants",
    });

    // Mối quan hệ OptionValue có nhiều VariantOptionSelection (nếu cần truy cập trực tiếp bảng trung gian)
    // (Từ index.js: db.VariantOptionSelection.belongsTo(db.OptionValue, { foreignKey: "option_value_id", as: "optionValue", });)
    // Tương tự như ProductVariant, nếu bạn cần truy cập trực tiếp các bản ghi trung gian từ OptionValue, bạn có thể thêm hasMany này.
    OptionValue.hasMany(db.VariantOptionSelection, {
      foreignKey: "option_value_id",
      as: "variantOptionSelections", // Đặt tên alias rõ ràng hơn
    });
  };

  return OptionValue;
};
