const express = require("express");
const router = express.Router();
const attributeController = require("../controllers/attributeController");

router.post("/filter", attributeController.getAttributesByCategory);

module.exports = router;
