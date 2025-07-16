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

db.Service = require("./Service.js")(sequelize, Sequelize);
db.ServicePackage = require("./ServicePackage.js")(sequelize, Sequelize);
db.PackageServiceItem = require("./PackageServiceItem.js")(
  sequelize,
  Sequelize
);

db.ProductImage = require("./ProductImage.js")(sequelize, Sequelize);

db.Role.hasMany(db.User, {
  foreignKey: "role_id",
  as: "users",
});

db.User.belongsTo(db.Role, {
  foreignKey: "role_id",
  as: "role",
});

db.Brand.hasMany(db.Product, {
  foreignKey: "brand_id",
  as: "products",
});

db.Product.belongsTo(db.Brand, {
  foreignKey: "brand_id",
  as: "brand",
});

db.Category.hasMany(db.Product, {
  foreignKey: "category_id",
  as: "products",
});

db.Product.belongsTo(db.Category, {
  foreignKey: "category_id",
  as: "category",
});

db.Product.hasMany(db.ProductVariant, {
  foreignKey: "product_id",
  as: "variants",
});

db.ProductVariant.belongsTo(db.Product, {
  foreignKey: "product_id",
  as: "product",
});

db.Product.hasMany(db.ProductImage, {
  foreignKey: "product_id",
  as: "product_images",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

db.ProductImage.belongsTo(db.Product, {
  foreignKey: "product_id",
  as: "product",
});

db.Category.hasMany(db.Option, {
  foreignKey: "category_id",
  as: "options",
});

db.Option.belongsTo(db.Category, {
  foreignKey: "category_id",
  as: "category",
});

db.Option.hasMany(db.OptionValue, {
  foreignKey: "option_id",
  as: "optionValues",
});

db.OptionValue.belongsTo(db.Option, {
  foreignKey: "option_id",
  as: "option",
});

db.ProductVariant.belongsToMany(db.OptionValue, {
  through: db.VariantOptionSelection,
  foreignKey: "variant_id",
  otherKey: "option_value_id",
  as: "selectedOptionValues",
});

db.OptionValue.belongsToMany(db.ProductVariant, {
  through: db.VariantOptionSelection,
  foreignKey: "option_value_id",
  otherKey: "variant_id",
  as: "productVariants",
});

db.VariantOptionSelection.belongsTo(db.ProductVariant, {
  foreignKey: "variant_id",
  as: "productVariant",
});
db.VariantOptionSelection.belongsTo(db.OptionValue, {
  foreignKey: "option_value_id",
  as: "optionValue",
});

db.ProductVariant.hasMany(db.ServicePackage, {
  foreignKey: "variant_id",
  as: "servicePackages",
});

db.ServicePackage.belongsTo(db.ProductVariant, {
  foreignKey: "variant_id",
  as: "productVariant",
});

db.ServicePackage.hasMany(db.PackageServiceItem, {
  foreignKey: "package_id",
  as: "packageItems",
});

db.PackageServiceItem.belongsTo(db.ServicePackage, {
  foreignKey: "package_id",
  as: "servicePackage",
});

db.Service.hasMany(db.PackageServiceItem, {
  foreignKey: "service_id",
  as: "packageServiceItems",
});

db.PackageServiceItem.belongsTo(db.Service, {
  foreignKey: "service_id",
  as: "serviceDefinition",
});

db.Category.hasMany(db.Service, {
  foreignKey: "category_id",
  as: "services",
});

db.Service.belongsTo(db.Category, {
  foreignKey: "category_id",
  as: "serviceCategory",
});

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
