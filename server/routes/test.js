// server/routes/test.js
const express = require("express");
const router = express.Router();

const testController = require("../controllers/testController");
const requireAuth = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth"); // file below

// My tests (used by dashboard ?status=Scheduled)
router.get("/test", requireAuth, testController.getMyTests);

// Public list & detail
router.get("/test/public", optionalAuth, testController.getPublicTests);
router.get("/test/public/:link", optionalAuth, testController.getPublicTest);

// Registration
router.get("/test/registered/:link", optionalAuth, testController.checkRegistration);
router.post("/test/:link/register", requireAuth, testController.registerForTest);

// Create & submit
router.post("/test", requireAuth, testController.createTest);
router.post("/test/:id/submit", requireAuth, testController.submitAnswers);

module.exports = router;
