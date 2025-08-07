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

router.put(
  "/decrease-cart-item",
  identifyUserOrGuest,
  cartController.decreaseItem
);

router.put(
  "/increase-cart-item",
  identifyUserOrGuest,
  cartController.increaseItem
);

router.put("/delete-cart-item", identifyUserOrGuest, cartController.deleteItem);

module.exports = router;
