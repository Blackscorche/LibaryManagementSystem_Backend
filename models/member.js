// 1. Updated Member Model - Just change photoUrl field
const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    memberName: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: false
    },
    occupation: {
        type: String,
        required: false
    },
    nic: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },
    // Updated photoUrl for Cloudinary
    photoUrl: {
        url: {
            type: String,
            required: false
        },
        publicId: {
            type: String,
            required: false
        }
    }
});

module.exports = mongoose.model('Member', memberSchema);
