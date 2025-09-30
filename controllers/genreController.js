const Genre = require('../models/genre');
const Book = require('../models/book');

// Read - Get single genre
const getGenre = async (req, res) => {
    try {
        const genreId = req.params.id;
        const genre = await Genre.findById(genreId);

        if (!genre) {
            return res.status(404).json({
                success: false,
                message: "Genre not found"
            });
        }

        // Optionally get book count for this genre
        const bookCount = await Book.countDocuments({ genreId });

        return res.status(200).json({
            success: true,
            genre: {
                ...genre.toObject(),
                bookCount
            }
        });
    } catch (err) {
        console.error('Get genre error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Read - Get all genres
const getAllGenres = async (req, res) => {
    try {
        const genres = await Genre.find({}).sort({ name: 1 });

        // Get book counts for all genres
        const genresWithCounts = await Promise.all(
            genres.map(async (genre) => {
                const bookCount = await Book.countDocuments({ genreId: genre._id });
                return {
                    ...genre.toObject(),
                    bookCount
                };
            })
        );

        return res.status(200).json({
            success: true,
            genresList: genresWithCounts
        });
    } catch (err) {
        console.error('Get all genres error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Create - Add new genre
const addGenre = async (req, res) => {
    try {
        const genreData = { ...req.body };

        // Check if genre with same name already exists
        const existingGenre = await Genre.findOne({
            name: { $regex: new RegExp(`^${genreData.name}$`, 'i') }
        });

        if (existingGenre) {
            return res.status(400).json({
                success: false,
                message: "Genre with this name already exists"
            });
        }

        const genre = await Genre.create(genreData);

        return res.status(201).json({
            success: true,
            newGenre: genre
        });
    } catch (err) {
        console.error('Add genre error:', err);

        // Handle duplicate key error
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Genre with this name already exists"
            });
        }

        return res.status(400).json({ success: false, error: err.message });
    }
};

// Update - Update genre
const updateGenre = async (req, res) => {
    try {
        const genreId = req.params.id;
        const updateData = { ...req.body };

        const genre = await Genre.findById(genreId);
        if (!genre) {
            return res.status(404).json({
                success: false,
                message: "Genre not found"
            });
        }

        // If name is being updated, check for duplicates
        if (updateData.name && updateData.name !== genre.name) {
            const existingGenre = await Genre.findOne({
                name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
                _id: { $ne: genreId }
            });

            if (existingGenre) {
                return res.status(400).json({
                    success: false,
                    message: "Another genre with this name already exists"
                });
            }
        }

        const updatedGenre = await Genre.findByIdAndUpdate(
            genreId,
            updateData,
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            updatedGenre
        });
    } catch (err) {
        console.error('Update genre error:', err);

        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Genre with this name already exists"
            });
        }

        return res.status(400).json({ success: false, error: err.message });
    }
};

// Delete - Delete genre (with safety check)
const deleteGenre = async (req, res) => {
    try {
        const genreId = req.params.id;

        const genre = await Genre.findById(genreId);
        if (!genre) {
            return res.status(404).json({
                success: false,
                message: "Genre not found"
            });
        }

        // Check if any books are using this genre
        const bookCount = await Book.countDocuments({ genreId });

        if (bookCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete genre. ${bookCount} book(s) are currently assigned to this genre.`,
                bookCount
            });
        }

        const deletedGenre = await Genre.findByIdAndDelete(genreId);

        return res.status(200).json({
            success: true,
            message: "Genre deleted successfully",
            deletedGenre
        });
    } catch (err) {
        console.error('Delete genre error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Get books by genre
const getGenreBooks = async (req, res) => {
    try {
        const genreId = req.params.id;

        const genre = await Genre.findById(genreId);
        if (!genre) {
            return res.status(404).json({
                success: false,
                message: "Genre not found"
            });
        }

        const books = await Book.find({ genreId })
            .populate('authorId', 'name photoUrl')
            .sort({ name: 1 });

        return res.status(200).json({
            success: true,
            genre,
            books
        });
    } catch (err) {
        console.error('Get genre books error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Get popular genres (by book count)
const getPopularGenres = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const popularGenres = await Book.aggregate([
            {
                $group: {
                    _id: '$genreId',
                    bookCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'genres',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'genre'
                }
            },
            {
                $unwind: '$genre'
            },
            {
                $sort: { bookCount: -1 }
            },
            {
                $limit: limit
            },
            {
                $project: {
                    _id: '$genre._id',
                    name: '$genre.name',
                    description: '$genre.description',
                    slug: '$genre.slug',
                    bookCount: 1
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            popularGenres
        });
    } catch (err) {
        console.error('Get popular genres error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Search genres
const searchGenres = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const genres = await Genre.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        }).sort({ name: 1 });

        // Get book counts for search results
        const genresWithCounts = await Promise.all(
            genres.map(async (genre) => {
                const bookCount = await Book.countDocuments({ genreId: genre._id });
                return {
                    ...genre.toObject(),
                    bookCount
                };
            })
        );

        return res.status(200).json({
            success: true,
            genresList: genresWithCounts
        });
    } catch (err) {
        console.error('Search genres error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

module.exports = {
    getGenre,
    getAllGenres,
    addGenre,
    updateGenre,
    deleteGenre,
    getGenreBooks,
    getPopularGenres,
    searchGenres
};

// // 3. Updated routes example (routes/genres.js)
// const express = require('express');
// const router = express.Router();
// const {
//     getGenre,
//     getAllGenres,
//     addGenre,
//     updateGenre,
//     deleteGenre,
//     getGenreBooks,
//     getPopularGenres,
//     searchGenres
// } = require('../controllers/genre');

// // Genre routes
// router.get('/', getAllGenres);
// router.get('/popular', getPopularGenres); // GET /genres/popular?limit=5
// router.get('/search', searchGenres); // GET /genres/search?query=fiction
// router.get('/:id', getGenre);
// router.get('/:id/books', getGenreBooks); // Get all books in a genre
// router.post('/', addGenre);
// router.put('/:id', updateGenre);
// router.delete('/:id', deleteGenre);

// module.exports = router;