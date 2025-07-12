module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define(
    "users",
    {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      avatar: {
        type: Sequelize.STRING,
      },
      password_hash: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      full_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone_number: {
        type: Sequelize.STRING,
      },
      address: {
        type: Sequelize.STRING,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        onUpdate: Sequelize.NOW,
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "roles",
          key: "role_id",
        },
      },
      login_method: {
        type: Sequelize.STRING(50), // Đảm bảo độ dài khớp với DB
        allowNull: false,
        defaultValue: "traditional",
      },
      google_sub_id: {
        type: Sequelize.STRING(255), // Đảm bảo độ dài khớp với DB
        unique: true,
        allowNull: true, // Cho phép NULL
      },
      is_email_verified: {
        type: Sequelize.BOOLEAN, // Sequelize sẽ map thành TINYINT(1) trong MySQL
        allowNull: false,
        defaultValue: false,
      },
      is_profile_complete: {
        type: Sequelize.BOOLEAN, // Sequelize sẽ map thành TINYINT(1) trong MySQL
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      timestamps: false,
    }
  );

  return User;
};
