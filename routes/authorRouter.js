const express = require("express");
const router = express.Router();
const { uploadAuthorPhoto } = require('../config/cloudinary'); // Add this

const {
    getAuthor,
    getAllAuthors,
    addAuthor,
    updateAuthor,
    deleteAuthor
} = require('../controllers/authorController');

router.get("/getAll", getAllAuthors);
router.get("/get/:id", getAuthor);
router.post("/add", uploadAuthorPhoto.single('photoUrl'), addAuthor); // Add middleware
router.put("/update/:id", uploadAuthorPhoto.single('photoUrl'), updateAuthor); // Add middleware
router.delete("/delete/:id", deleteAuthor);

module.exports = router;