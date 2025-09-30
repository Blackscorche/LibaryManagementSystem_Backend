// Import required modules
const express = require("express");
const router = express.Router();

// Import Cloudinary upload middleware
const { uploadProfile } = require('../config/cloudinary');

// Import functions from controller
const {
  getUser,
  getAllUsers,
  getAllMembers,
  addUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

router.get("/getAll", (req, res) => getAllUsers(req, res));

router.get("/getAllMembers", (req, res) => getAllMembers(req, res));

router.get("/get/:id", (req, res) => getUser(req, res));

// Add multer middleware for file upload
router.post("/add", uploadProfile.single('photoUrl'), (req, res) => addUser(req, res));

// Add multer middleware for file upload
router.put("/update/:id", uploadProfile.single('photoUrl'), (req, res) => updateUser(req, res));

router.delete("/delete/:id", (req, res) => deleteUser(req, res));

module.exports = router;