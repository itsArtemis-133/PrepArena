// server/routes/auth.js
const express = require("express");
const router = express.Router();

let ctrl;
try {
  ctrl = require("../controllers/authController");
} catch (e) {
  console.error("[auth] controllers/authController not found:", e.message);
  ctrl = {};
}

const loginHandler =
  ctrl.login || ctrl.loginUser || ctrl.signIn || ctrl.authenticate;

const registerHandler =
  ctrl.register || ctrl.registerUser || ctrl.signUp || ctrl.createUser;

router.post(
  "/login",
  typeof loginHandler === "function"
    ? loginHandler
    : (_req, res) =>
        res
          .status(500)
          .json({ message: "Export a function: login / loginUser / signIn" })
);

router.post(
  "/register",
  typeof registerHandler === "function"
    ? registerHandler
    : (_req, res) =>
        res
          .status(500)
          .json({ message: "Export a function: register / registerUser / signUp" })
);

module.exports = router;
