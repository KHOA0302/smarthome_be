const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const brandController = require("../controllers/brandController");

router.get("/all-brands", brandController.getAllBrands);
router.post(
  "/create-brand",
  protect,
  authorize("admin"),
  brandController.createBrand
);

module.exports = router;
