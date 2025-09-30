const Author = require('../models/author');
const { cloudinary } = require('../config/cloudinary');

const getAllAuthors = async (req, res) => {
    try {
        const authorsList = await Author.find();
        return res.status(200).json({
            success: true,
            authorsList
        });
    } catch (err) {
        console.error('Get all authors error:', err);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

const getAuthor = async (req, res) => {
    try {
        const author = await Author.findById(req.params.id);
        if (!author) {
            return res.status(404).json({
                success: false,
                message: "Author not found"
            });
        }
        return res.status(200).json({
            success: true,
            author
        });
    } catch (err) {
        console.error('Get author error:', err);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

const addAuthor = async (req, res) => {
    try {
        const authorData = {
            name: req.body.name,
            description: req.body.description
        };

        // Add photo if uploaded
        if (req.file) {
            authorData.photoUrl = {
                url: req.file.path,
                publicId: req.file.filename
            };
        } else {
            // Use DiceBear API as fallback
            authorData.photoUrl = {
                url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.body.name)}`
            };
        }

        const newAuthor = new Author(authorData);
        const savedAuthor = await newAuthor.save();

        return res.status(201).json({
            success: true,
            author: savedAuthor
        });
    } catch (err) {
        // Clean up uploaded file if author creation fails
        if (req.file) {
            await cloudinary.uploader.destroy(req.file.filename);
        }
        console.error('Add author error:', err);
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

const updateAuthor = async (req, res) => {
    try {
        const authorId = req.params.id;
        const author = await Author.findById(authorId);

        if (!author) {
            if (req.file) {
                await cloudinary.uploader.destroy(req.file.filename);
            }
            return res.status(404).json({
                success: false,
                message: "Author not found"
            });
        }

        const updateData = {
            name: req.body.name,
            description: req.body.description
        };

        // Handle photo update
        if (req.file) {
            // Delete old photo if it exists and has a publicId (Cloudinary image)
            if (author.photoUrl?.publicId) {
                await cloudinary.uploader.destroy(author.photoUrl.publicId);
            }

            updateData.photoUrl = {
                url: req.file.path,
                publicId: req.file.filename
            };
        }

        const updatedAuthor = await Author.findByIdAndUpdate(
            authorId,
            updateData,
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            updatedAuthor
        });
    } catch (err) {
        if (req.file) {
            await cloudinary.uploader.destroy(req.file.filename);
        }
        console.error('Update author error:', err);
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

const deleteAuthor = async (req, res) => {
    try {
        const author = await Author.findById(req.params.id);

        if (!author) {
            return res.status(404).json({
                success: false,
                message: "Author not found"
            });
        }

        // Delete photo from Cloudinary if it exists
        if (author.photoUrl?.publicId) {
            await cloudinary.uploader.destroy(author.photoUrl.publicId);
        }

        await Author.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            success: true,
            message: "Author deleted successfully"
        });
    } catch (err) {
        console.error('Delete author error:', err);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

module.exports = {
    getAllAuthors,
    getAuthor,
    addAuthor,
    updateAuthor,
    deleteAuthor
};