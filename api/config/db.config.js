const DB_IP = process.env.DB_IP;
const DB_NAME = process.env.DB_NAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_USER = process.env.DB_USER;

module.exports = {
  HOST: DB_IP,
  USER: DB_USER,
  PASSWORD: DB_PASSWORD,
  DB: DB_NAME,
  dialect: "mysql",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  port: 3306,
};
