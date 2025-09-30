const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
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
}, {
    timestamps: true
});

module.exports = mongoose.model('Author', authorSchema);