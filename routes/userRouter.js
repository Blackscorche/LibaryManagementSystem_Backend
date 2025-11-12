// Import required modules
const express = require("express");
const router = express.Router();

// Import Cloudinary upload middleware
const { uploadProfile } = require('../config/cloudinary');

// Import authentication middleware
const { isAuthenticated, isAuthorized, isAdmin } = require('../middleware/authMiddleware');

// Import functions from controller
const {
  getUser,
  getAllUsers,
  getAllMembers,
  addUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

router.get("/getAll", isAuthenticated, isAdmin, (req, res) => getAllUsers(req, res));

router.get("/getAllMembers", isAuthenticated, (req, res) => getAllMembers(req, res));

router.get("/get/:id", isAuthenticated, isAuthorized, (req, res) => getUser(req, res));

// Add multer middleware for file upload
router.post("/add", isAuthenticated, isAdmin, uploadProfile.single('photoUrl'), (req, res) => addUser(req, res));

// Add multer middleware for file upload
router.put("/update/:id", isAuthenticated, isAuthorized, uploadProfile.single('photoUrl'), (req, res) => updateUser(req, res));

router.delete("/delete/:id", isAuthenticated, isAuthorized, (req, res) => deleteUser(req, res));

module.exports = router;