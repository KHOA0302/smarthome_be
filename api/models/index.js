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

// =============================================================== //
db.User = require("./User.js")(sequelize, Sequelize);
db.Role = require("./Role.js")(sequelize, Sequelize);

// =============================================================== //
db.Brand = require("./Brand.js")(sequelize, Sequelize);
db.Category = require("./Category.js")(sequelize, Sequelize);
db.Product = require("./Product.js")(sequelize, Sequelize);
db.ProductImage = require("./ProductImage.js")(sequelize, Sequelize);
db.ProductVariant = require("./ProductVariant.js")(sequelize, Sequelize);

// =============================================================== //
db.Option = require("./Option.js")(sequelize, Sequelize);
db.OptionValue = require("./OptionValue.js")(sequelize, Sequelize);
db.VariantOptionSelection = require("./VariantOptionSelection.js")(
  sequelize,
  Sequelize
);

// =============================================================== //
db.Service = require("./Service.js")(sequelize, Sequelize);
db.ServicePackage = require("./ServicePackage.js")(sequelize, Sequelize);
db.PackageServiceItem = require("./PackageServiceItem.js")(
  sequelize,
  Sequelize
);

// =============================================================== //
db.AttributeGroup = require("./AttributeGroup.js")(sequelize, Sequelize);
db.ProductAttribute = require("./ProductAttribute.js")(sequelize, Sequelize);
db.ProductSpecification = require("./ProductSpecification.js")(
  sequelize,
  Sequelize
);

// =============================================================== //
db.Cart = require("./Cart.js")(sequelize, Sequelize);
db.CartItem = require("./CartItem.js")(sequelize, Sequelize);
db.CartItemService = require("./CartItemService.js")(sequelize, Sequelize);

//============================================================//
db.Order = require("./Order.js")(sequelize, Sequelize);
db.OrderItem = require("./OrderItem.js")(sequelize, Sequelize);
db.OrderItemService = require("./OrderItemService.js")(sequelize, Sequelize);

//=============================================================//
db.ProductEvent = require("./ProductEvent.js")(sequelize, Sequelize);

//=============================================================//
db.Review = require("./Review.js")(sequelize, Sequelize);

//============================================================//
db.OutOfStockNotify = require("./OutOfStockNotify.js")(sequelize, Sequelize);

//===============================================================//
db.Promotion = require("./Promotion.js")(sequelize, Sequelize);
db.PromotionVariant = require("./PromotionVariant.js")(sequelize, Sequelize);

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
