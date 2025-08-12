// server/routes/api.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/authMiddleware");

let announcementsCtrl, resultsCtrl;
try { announcementsCtrl = require("../controllers/announcementController"); } catch {}
try { resultsCtrl = require("../controllers/resultController"); } catch {}

const listAnnouncements =
  (announcementsCtrl && (announcementsCtrl.list || announcementsCtrl.getAnnouncements)) ||
  ((req, res) => res.json({ announcements: [] }));

const recentResults =
  (resultsCtrl && (resultsCtrl.getRecentResults || resultsCtrl.recent)) ||
  ((req, res) => res.json({ results: [] }));

router.get("/announcements", listAnnouncements);
router.get("/test/results/recent", requireAuth, recentResults);

module.exports = router;
