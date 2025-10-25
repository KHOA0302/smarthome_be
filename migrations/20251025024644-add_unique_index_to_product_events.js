"use strict";
require("dotenv").config();

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint("product_events", {
      fields: ["user_id", "variant_id"],
      type: "unique",
      name: "unique_user_variant_click_count",
    });

    await queryInterface.addIndex(
      "product_events",
      ["session_id", "variant_id"],
      {
        name: "idx_session_variant",
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      "product_events",
      "unique_user_variant_click_count"
    );

    await queryInterface.removeIndex("product_events", "idx_session_variant");
  },
};
