const db = require("../models");

const testDbConnection = async () => {
  try {
    await db.sequelize.authenticate();
    console.log(
      "Connection to the database has been established successfully."
    );
    return true;
  } catch (err) {
    console.error("Unable to connect to the database:", err);
    return false;
  }
};

module.exports = testDbConnection;
