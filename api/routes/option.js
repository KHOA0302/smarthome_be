const express = require("express");
const router = express.Router();
const optionController = require("../controllers/optionController");

router.post("/filter", optionController.filterOptions);

module.exports = router;
