// 1. Updated Borrowal Model
const mongoose = require('mongoose');

const borrowalSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Book'
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  borrowedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true,
    default: function () {
      // Default due date is 14 days from borrowed date
      const date = new Date();
      date.setDate(date.getDate() + 14);
      return date;
    }
  },
  returnedDate: {
    type: Date,
    required: false
  },
  status: {
    type: String,
    enum: ['borrowed', 'returned', 'overdue'],
    default: 'borrowed',
    required: true
  },
  fine: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Virtual to check if borrowal is overdue
borrowalSchema.virtual('isOverdue').get(function () {
  if (this.status === 'returned') return false;
  return new Date() > this.dueDate;
});

// Method to calculate fine (e.g., $1 per day overdue)
borrowalSchema.methods.calculateFine = function (finePerDay = 1) {
  if (this.status === 'returned' || !this.isOverdue) {
    return 0;
  }

  const today = new Date();
  const overdueDays = Math.ceil((today - this.dueDate) / (1000 * 60 * 60 * 24));
  return overdueDays * finePerDay;
};

// Pre-save hook to update status if overdue
borrowalSchema.pre('save', function (next) {
  if (this.status !== 'returned' && new Date() > this.dueDate) {
    this.status = 'overdue';
    this.fine = this.calculateFine();
  }
  next();
});

// Ensure virtuals are included in JSON
borrowalSchema.set('toJSON', { virtuals: true });
borrowalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Borrowal', borrowalSchema);
