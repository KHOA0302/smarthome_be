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
  logging: (msg) => {
    // Log tất cả các câu lệnh SQL được thực thi
    if (msg.startsWith("Executing")) {
      console.log(`[SEQUELIZE QUERY]: ${msg}`);
    } else {
      // Log các thông báo Sequelize khác nếu cần
      // console.log(`[SEQUELIZE INFO]: ${msg}`);
    }
  },
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

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
