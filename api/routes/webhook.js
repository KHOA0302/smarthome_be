const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

// Healthcheck đơn giản
router.get("/health", (req, res) => res.json({ ok: true }));

router.post("/", webhookController.handleWebhook);

module.exports = router;
