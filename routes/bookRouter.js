const express = require("express");
const router = express.Router();
const { uploadBookCover } = require('../config/cloudinary'); // Add this import

const {
    getBook,
    getAllBooks,
    addBook,
    updateBook,
    deleteBook
} = require('../controllers/bookController');

router.get("/getAll", getAllBooks);
router.get("/get/:id", getBook);
router.post("/add", uploadBookCover.single('photoUrl'), addBook); // Add middleware
router.put("/update/:id", uploadBookCover.single('photoUrl'), updateBook); // Add middleware
router.delete("/delete/:id", deleteBook);

module.exports = router;