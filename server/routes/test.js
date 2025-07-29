// server/routes/test.js
const express = require('express');
const router  = express.Router();

const auth = require('../middleware/authMiddleware');

// Controllers for public‐facing listing
const publicTestController = require('../controllers/publicTestController');
// Controllers for protected test management
const testController       = require('../controllers/testController');

//
// 1) PUBLIC ROUTES (no auth)
//

// List all open/public tests
router.get(
  '/public',
  publicTestController.getPublicTests
);

// Fetch a single test by its share-link (uniqueId)
router.get(
  '/public/:uniqueId',
  publicTestController.getPublicTest
);

//
// 2) PROTECTED ROUTES (requires token)
//
router.use(auth);

// Create a new test
router.post(
  '/',
  testController.createTest
);

// List all tests created by the logged-in user
router.get(
  '/',
  testController.getAllTests
);

// (Optional) Fetch a single test by ID for the owner
router.get(
  '/:id',
  testController.getTestById
);

// Cancel a test
router.patch(
  '/:id/cancel',
  testController.cancelTest
);

// Reschedule a test
router.patch(
  '/:id/reschedule',
  testController.rescheduleTest
);

// —— NEW ENDPOINTS ——

// Submit answers for a test
router.post(
  '/:id/submit',
  testController.submitTest
);

// View your results for a test
router.get(
  '/:id/results',
  testController.getMyResults
);

module.exports = router;
