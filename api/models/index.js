const dbConfig = require("../config/db.config.js");

const Sequelize = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,

  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },

  port: dbConfig.port,
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require("./User.js")(sequelize, Sequelize);
db.Role = require("./Role.js")(sequelize, Sequelize);
db.Brand = require("./Brand.js")(sequelize, Sequelize);
db.Category = require("./Category.js")(sequelize, Sequelize);
db.Product = require("./Product.js")(sequelize, Sequelize);
db.ProductVariant = require("./ProductVariant.js")(sequelize, Sequelize);
db.Option = require("./Option.js")(sequelize, Sequelize);
db.OptionValue = require("./OptionValue.js")(sequelize, Sequelize);
db.VariantOptionSelection = require("./VariantOptionSelection.js")(
  sequelize,
  Sequelize
);

db.Role.hasMany(db.User, {
  foreignKey: "role_id",
  as: "users",
});

db.User.belongsTo(db.Role, {
  foreignKey: "role_id",
  as: "role",
});

// --- Mối quan hệ mới được thêm vào ---

// 1. Mối quan hệ giữa Brand và Product
// Một Brand có nhiều Products
db.Brand.hasMany(db.Product, {
  foreignKey: "brand_id",
  as: "products",
});
// Một Product thuộc về một Brand
db.Product.belongsTo(db.Brand, {
  foreignKey: "brand_id",
  as: "brand",
});

// 2. Mối quan hệ giữa Category và Product
// Một Category có nhiều Products
db.Category.hasMany(db.Product, {
  foreignKey: "category_id",
  as: "products",
});
// Một Product thuộc về một Category
db.Product.belongsTo(db.Category, {
  foreignKey: "category_id",
  as: "category",
});

// 3. Mối quan hệ giữa Product và ProductVariant
// Một Product có nhiều ProductVariants
db.Product.hasMany(db.ProductVariant, {
  foreignKey: "product_id",
  as: "variants",
});
// Một ProductVariant thuộc về một Product
db.ProductVariant.belongsTo(db.Product, {
  foreignKey: "product_id",
  as: "product",
});

// 4. Mối quan hệ giữa Category và Option
// Một Category có nhiều Options (ví dụ: một danh mục điện thoại có tùy chọn "Màu sắc", "Bộ nhớ")
db.Category.hasMany(db.Option, {
  foreignKey: "category_id",
  as: "options",
});
// Một Option thuộc về một Category
db.Option.belongsTo(db.Category, {
  foreignKey: "category_id",
  as: "category",
});

// 5. Mối quan hệ giữa Option và OptionValue
// Một Option có nhiều OptionValues (ví dụ: Option "Màu sắc" có các OptionValue "Đỏ", "Xanh")
db.Option.hasMany(db.OptionValue, {
  foreignKey: "option_id",
  as: "optionValues",
});
// Một OptionValue thuộc về một Option
db.OptionValue.belongsTo(db.Option, {
  foreignKey: "option_id",
  as: "option",
});

// 6. Mối quan hệ Many-to-Many giữa ProductVariant và OptionValue thông qua VariantOptionSelection
// Một ProductVariant có nhiều OptionValues được chọn
db.ProductVariant.belongsToMany(db.OptionValue, {
  through: db.VariantOptionSelection, // Tên model của bảng trung gian
  foreignKey: "variant_id", // Khóa ngoại trong bảng trung gian trỏ đến ProductVariant
  otherKey: "option_value_id", // Khóa ngoại trong bảng trung gian trỏ đến OptionValue
  as: "selectedOptionValues", // Alias khi bạn include các option values
});

// Một OptionValue có thể thuộc về nhiều ProductVariants (đã chọn)
db.OptionValue.belongsToMany(db.ProductVariant, {
  through: db.VariantOptionSelection, // Tên model của bảng trung gian
  foreignKey: "option_value_id", // Khóa ngoại trong bảng trung gian trỏ đến OptionValue
  otherKey: "variant_id", // Khóa ngoại trong bảng trung gian trỏ đến ProductVariant
  as: "productVariants", // Alias khi bạn include các product variants
});

// Nếu bạn muốn truy cập trực tiếp từ VariantOptionSelection đến ProductVariant và OptionValue
// (Điều này thường không cần thiết khi sử dụng belongsToMany, nhưng có thể hữu ích trong một số trường hợp)
db.VariantOptionSelection.belongsTo(db.ProductVariant, {
  foreignKey: "variant_id",
  as: "productVariant",
});
db.VariantOptionSelection.belongsTo(db.OptionValue, {
  foreignKey: "option_value_id",
  as: "optionValue",
});

module.exports = db;
