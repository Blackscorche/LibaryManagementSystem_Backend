// 1. Updated Genre Model
const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    }
}, {
    timestamps: true
});

// Generate slug from name before saving
genreSchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    next();
});

// Virtual to get book count (if you want to add this later)
genreSchema.virtual('bookCount', {
    ref: 'Book',
    localField: '_id',
    foreignField: 'genreId',
    count: true
});

// Ensure virtuals are included in JSON
genreSchema.set('toJSON', { virtuals: true });
genreSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Genre', genreSchema);