module.exports = (sequelize, Sequelize) => {
  const Brand = sequelize.define(
    "brands",
    {
      brand_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      brand_name: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      logo_url: {
        type: Sequelize.STRING,
      },
      description: {
        type: Sequelize.TEXT,
      },
    },
    {
      timestamps: false,
      tableName: "brands",
    }
  );

  // Định nghĩa hàm associate
  Brand.associate = (db) => {
    // Mối quan hệ Brand có nhiều Product
    // (Từ file index.js ban đầu: db.Brand.hasMany(db.Product, { foreignKey: "brand_id", as: "products", });)
    Brand.hasMany(db.Product, {
      foreignKey: "brand_id",
      as: "products",
    });
  };
  return Brand;
};
