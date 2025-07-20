const express = require("express");
const router = express.Router();
const brandController = require("../controllers/brandController");

router.get("/all-brands", brandController.getAllBrands);
router.post("/create-brand", brandController.createBrand);

module.exports = router;
