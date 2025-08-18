const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { identifyUserOrGuest } = require("../middleware/identifyUserOrGuest");

router.post("/login", identifyUserOrGuest, authController.handleLoginAttemp);

router.post("/register", authController.handleRegister);

router.post("/google", authController.handleGoogle);

router.get("/user-info", identifyUserOrGuest, authController.getUserInfo);

router.put(
  "/edit-info",
  protect,
  authorize("customer"),
  authController.editUserInfo
);

module.exports = router;
