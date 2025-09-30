const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for user profile pictures
const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'library_system/profiles',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [
            { width: 300, height: 300, crop: 'fill' },
            { quality: 'auto' }
        ]
    },
});

// Storage for book covers
const bookCoverStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'library_system/book_covers',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [
            { width: 400, height: 600, crop: 'fill' },
            { quality: 'auto' }
        ]
    },
});

// Multer upload middleware
const uploadProfile = multer({
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadBookCover = multer({
    storage: bookCoverStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const authorPhotoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'library_system/authors',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [
            { width: 400, height: 400, crop: 'fill' },
            { quality: 'auto' }
        ]
    },
});

const uploadAuthorPhoto = multer({
    storage: authorPhotoStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = {
    cloudinary,
    uploadProfile,
    uploadBookCover,
    uploadAuthorPhoto
};