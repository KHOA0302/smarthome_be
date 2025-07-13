const express = require("express");
const router = express.Router();

const serviceController = require("../controllers/serviceController");

router.post("/filter", serviceController.filterServices);

module.exports = router;
