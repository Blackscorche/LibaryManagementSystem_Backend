// 1. Updated Book Model
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  isbn: {
    type: String,
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'Author' // Add reference for populate
  },
  genreId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'Genre' // Add reference for populate
  },
  isAvailable: {
    type: Boolean,
    required: true,
    default: true
  },
  summary: {
    type: String,
    required: false
  },
  photoUrl: {
    url: {
      type: String,
      required: false
      // Remove the default line
    },
    publicId: {
      type: String,
      required: false
    }
  }
}, {
  timestamps: true
});

bookSchema.virtual('photoUrlString').get(function () {
  if (this.photoUrl && typeof this.photoUrl === 'object') {
    return this.photoUrl.url;
  }
  return this.photoUrl;
});
module.exports = mongoose.model('Book', bookSchema);
