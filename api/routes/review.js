const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { identifyUserOrGuest } = require("../middleware/identifyUserOrGuest");

router.post(
  "/create-review",
  identifyUserOrGuest,
  reviewController.createReview
);

module.exports = router;
