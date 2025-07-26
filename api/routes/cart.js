const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { identifyUserOrGuest } = require("../middleware/identifyUserOrGuest");

router.get("/get-cart-items", identifyUserOrGuest, cartController.getCartItem);

router.post(
  "/create-cart-item",
  identifyUserOrGuest,
  cartController.createCartItem
);

module.exports = router;
