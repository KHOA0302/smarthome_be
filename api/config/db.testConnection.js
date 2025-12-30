const db = require("../models");

const testDbConnection = async () => {
  try {
    await db.sequelize.authenticate();
    console.log("the database is CONNECTED.");
    return true;
  } catch (err) {
    console.error("Unable to connect to the database:", err);
    return false;
  }
};

module.exports = testDbConnection;
