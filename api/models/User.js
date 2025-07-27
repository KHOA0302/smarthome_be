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
      province: {
        type: Sequelize.STRING,
      },
      district: {
        type: Sequelize.STRING,
      },
      house_number: {
        type: Sequelize.STRING,
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
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "traditional",
      },
      google_sub_id: {
        type: Sequelize.STRING(255),
        unique: true,
        allowNull: true,
      },
      is_email_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_profile_complete: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    },
    {
      timestamps: false,
    }
  );

  User.associate = (db) => {
    User.belongsTo(db.Role, {
      foreignKey: "role_id",
      as: "role",
    });

    User.hasMany(db.Cart, {
      foreignKey: "user_id",
      as: "carts",
    });
    User.hasMany(db.Order, {
      foreignKey: "user_id",
      as: "orders",
    });
  };

  return User;
};
