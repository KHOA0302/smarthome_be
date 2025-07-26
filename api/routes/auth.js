const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { identifyUserOrGuest } = require("../middleware/identifyUserOrGuest");

router.post("/login", identifyUserOrGuest, authController.handleLoginAttemp);

router.post("/register", authController.handleRegister);

router.post("/google", authController.handleGoogle);

router.get("/user-info", identifyUserOrGuest, authController.getUserInfo);

module.exports = router;
