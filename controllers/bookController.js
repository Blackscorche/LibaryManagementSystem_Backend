// Complete Fixed Book Controller with Cloudinary support
const Book = require('../models/book');
const mongoose = require("mongoose");
const { cloudinary } = require('../config/cloudinary');

// Read - Get single book
const getBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findById(bookId)
      .populate('authorId', 'name photoUrl')
      .populate('genreId', 'name')
      .lean();

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found"
      });
    }

    // Transform the book data to flatten photoUrl
    const transformedBook = {
      ...book,
      photoUrl: book.photoUrl?.url || book.photoUrl || null, // Changed to null instead of demo URL
      author: book.authorId ? {
        ...book.authorId,
        photoUrl: book.authorId.photoUrl?.url || book.authorId.photoUrl || null
      } : null,
      genre: book.genreId || null
    };

    return res.status(200).json({
      success: true,
      book: transformedBook
    });
  } catch (err) {
    console.error('Get book error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

// Read - Get all books
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find({})
      .populate('authorId', 'name photoUrl')
      .populate('genreId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Transform the data to flatten photoUrl
    const transformedBooks = books.map(book => ({
      ...book,
      photoUrl: book.photoUrl?.url || book.photoUrl || null, // Changed to null instead of demo URL
      author: book.authorId ? {
        ...book.authorId,
        photoUrl: book.authorId.photoUrl?.url || book.authorId.photoUrl || null
      } : null,
      genre: book.genreId || null
    }));

    return res.status(200).json({
      success: true,
      booksList: transformedBooks
    });
  } catch (err) {
    console.error('Get all books error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

// Create - Add new book with cover upload
const addBook = async (req, res) => {
  try {
    const bookData = { ...req.body };

    // Convert string IDs to ObjectId if they exist
    if (bookData.genreId) {
      bookData.genreId = new mongoose.Types.ObjectId(bookData.genreId);
    }
    if (bookData.authorId) {
      bookData.authorId = new mongoose.Types.ObjectId(bookData.authorId);
    }

    // Add book cover if uploaded
    if (req.file) {
      bookData.photoUrl = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    const book = await Book.create(bookData);

    // Populate the created book for response
    const populatedBook = await Book.findById(book._id)
      .populate('authorId', 'name photoUrl')
      .populate('genreId', 'name')
      .lean();

    // Transform the response
    const transformedBook = {
      ...populatedBook,
      photoUrl: populatedBook.photoUrl?.url || populatedBook.photoUrl || null, // Changed to null
      author: populatedBook.authorId ? {
        ...populatedBook.authorId,
        photoUrl: populatedBook.authorId.photoUrl?.url || populatedBook.authorId.photoUrl || null
      } : null,
      genre: populatedBook.genreId || null
    };

    return res.status(201).json({
      success: true,
      newBook: transformedBook
    });
  } catch (err) {
    // Clean up uploaded file if book creation fails
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    console.error('Add book error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

// Update - Update book with optional cover update
const updateBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    const updateData = { ...req.body };

    const book = await Book.findById(bookId);
    if (!book) {
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(404).json({
        success: false,
        message: "Book not found"
      });
    }

    // Handle ObjectId conversions
    if (updateData.genreId) {
      updateData.genreId = new mongoose.Types.ObjectId(updateData.genreId);
    }
    if (updateData.authorId) {
      updateData.authorId = new mongoose.Types.ObjectId(updateData.authorId);
    }

    // Handle cover image update
    if (req.file) {
      // Delete old cover if it exists and has a publicId
      if (book.photoUrl && book.photoUrl.publicId) {
        await cloudinary.uploader.destroy(book.photoUrl.publicId);
      }

      updateData.photoUrl = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('authorId', 'name photoUrl')
      .populate('genreId', 'name')
      .lean();

    // Transform the response
    const transformedBook = {
      ...updatedBook,
      photoUrl: updatedBook.photoUrl?.url || updatedBook.photoUrl || null, // Changed to null
      author: updatedBook.authorId ? {
        ...updatedBook.authorId,
        photoUrl: updatedBook.authorId.photoUrl?.url || updatedBook.authorId.photoUrl || null
      } : null,
      genre: updatedBook.genreId || null
    };

    return res.status(200).json({
      success: true,
      updatedBook: transformedBook
    });
  } catch (err) {
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    console.error('Update book error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

// Delete - Delete book and cleanup cover
const deleteBook = async (req, res) => {
  try {
    const bookId = req.params.id;

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found"
      });
    }

    // Delete cover from Cloudinary if it exists
    if (book.photoUrl && book.photoUrl.publicId) {
      await cloudinary.uploader.destroy(book.photoUrl.publicId);
    }

    const deletedBook = await Book.findByIdAndDelete(bookId);

    return res.status(200).json({
      success: true,
      message: "Book deleted successfully",
      deletedBook
    });
  } catch (err) {
    console.error('Delete book error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

// Additional method to delete book cover only
const deleteBookCover = async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found"
      });
    }

    if (book.photoUrl && book.photoUrl.publicId) {
      await cloudinary.uploader.destroy(book.photoUrl.publicId);

      book.photoUrl = null; // Changed to null instead of demo URL
      await book.save();
    }

    return res.status(200).json({
      success: true,
      message: "Book cover deleted",
      book
    });
  } catch (err) {
    console.error('Delete book cover error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Search books by title, author, or ISBN
const searchBooks = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const books = await Book.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { isbn: { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } }
      ]
    })
      .populate('authorId', 'name photoUrl')
      .populate('genreId', 'name')
      .lean();

    // Transform the search results
    const transformedBooks = books.map(book => ({
      ...book,
      photoUrl: book.photoUrl?.url || book.photoUrl || null, // Changed to null
      author: book.authorId ? {
        ...book.authorId,
        photoUrl: book.authorId.photoUrl?.url || book.authorId.photoUrl || null
      } : null,
      genre: book.genreId || null
    }));

    // Also search by author name (requires a separate query since we need to populate first)
    const authorBooks = await Book.find({})
      .populate({
        path: 'authorId',
        match: { name: { $regex: query, $options: 'i' } },
        select: 'name photoUrl'
      })
      .populate('genreId', 'name')
      .lean();

    const filteredAuthorBooks = authorBooks
      .filter(book => book.authorId !== null)
      .map(book => ({
        ...book,
        photoUrl: book.photoUrl?.url || book.photoUrl || null, // Changed to null
        author: book.authorId ? {
          ...book.authorId,
          photoUrl: book.authorId.photoUrl?.url || book.authorId.photoUrl || null
        } : null,
        genre: book.genreId || null
      }));

    // Combine and remove duplicates
    const allResults = [...transformedBooks, ...filteredAuthorBooks];
    const uniqueResults = allResults.filter((book, index, self) =>
      index === self.findIndex(b => b._id.toString() === book._id.toString())
    );

    return res.status(200).json({
      success: true,
      booksList: uniqueResults
    });
  } catch (err) {
    console.error('Search books error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  getBook,
  getAllBooks,
  addBook,
  updateBook,
  deleteBook,
  deleteBookCover,
  searchBooks
};