const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const categoryController = require("../controllers/categoryController");

router.get("/all-categories", categoryController.getAllCategories);
router.post(
  "/create-category",
  protect,
  authorize("admin"),
  categoryController.createCategory
);
router.put(
  "/edit-category",
  protect,
  authorize("admin"),
  categoryController.editCategory
);

module.exports = router;
