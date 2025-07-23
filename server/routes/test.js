const express = require("express");
const router = express.Router();

const {
  createTest,
  cancelTest,
  rescheduleTest,
  getAllTests,
  getPublicTest,
} = require("../controllers/testController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/public/:uniqueId", getPublicTest);
router.post("/", authMiddleware, createTest);
router.get("/", authMiddleware, getAllTests);
router.patch("/:id/cancel", authMiddleware, cancelTest);
router.patch("/:id/reschedule", authMiddleware, rescheduleTest);

module.exports = router;
