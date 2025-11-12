// Import required modules
const express = require("express")
const router = express.Router();

// Import functions from controller
const {
  loginUser,
  registerUser,
  logoutUser,
} = require('../controllers/authController')

router.post("/login", (req, res, next) => loginUser(req, res, next))

router.post("/register", (req, res) => registerUser(req, res))

router.get("/logout", (req, res, next) => logoutUser(req, res, next))

module.exports = router;
