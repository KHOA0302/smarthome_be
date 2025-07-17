module.exports = (sequelize, Sequelize) => {
  const Role = sequelize.define(
    "roles",
    {
      role_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      role_name: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: false,
    }
  );

  // Định nghĩa hàm associate
  Role.associate = (db) => {
    // Mối quan hệ Role có nhiều User
    // (Từ file index.js ban đầu: db.Role.hasMany(db.User, { foreignKey: "role_id", as: "users", });)
    Role.hasMany(db.User, {
      foreignKey: "role_id",
      as: "users",
    });
  };
  return Role;
};
