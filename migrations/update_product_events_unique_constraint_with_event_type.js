"use strict";
require("dotenv").config();

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "product_events";

    const index1Name = "idx_user_event_variant_on_product_events";
    const index1Attributes = ["user_id", "event_type", "variant_id"];

    await queryInterface.addIndex(tableName, index1Attributes, {
      name: index1Name,
    });

    const index2Name = "idx_session_event_variant_on_product_events";
    const index2Attributes = ["session_id", "event_type", "variant_id"];

    await queryInterface.addIndex(tableName, index2Attributes, {
      name: index2Name,
    });
  },

  async down(queryInterface, Sequelize) {
    const tableName = "product_events";

    const index1Name = "idx_user_event_variant_on_product_events";
    await queryInterface.removeIndex(tableName, index1Name);

    const index2Name = "idx_session_event_variant_on_product_events";
    await queryInterface.removeIndex(tableName, index2Name);
  },
};
