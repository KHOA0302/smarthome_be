const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

router.get("/all-categories", categoryController.getAllCategories);
router.post("/create-category", categoryController.createCategory);

module.exports = router;
