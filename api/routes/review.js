const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { identifyUserOrGuest } = require("../middleware/identifyUserOrGuest");

router.post(
  "/create-review",
  identifyUserOrGuest,
  reviewController.createReview
);

router.get("/get-reviews", reviewController.getReviews);

module.exports = router;
