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

db.Role.hasMany(db.User, {
  foreignKey: "role_id",
  as: "users",
});

db.User.belongsTo(db.Role, {
  foreignKey: "role_id",
  as: "role",
});

module.exports = db;
