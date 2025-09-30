const Borrowal = require('../models/borrowal');
const Book = require('../models/book');
const User = require('../models/user');
const mongoose = require("mongoose");

// Read - Get single borrowal
const getBorrowal = async (req, res) => {
    try {
        const borrowalId = req.params.id;
        const borrowal = await Borrowal.findById(borrowalId)
            .populate('memberId', 'name email photoUrl')
            .populate('bookId', 'name isbn photoUrl authorId')
            .populate({
                path: 'bookId',
                populate: {
                    path: 'authorId',
                    select: 'name'
                }
            });

        if (!borrowal) {
            return res.status(404).json({
                success: false,
                message: "Borrowal not found"
            });
        }

        return res.status(200).json({
            success: true,
            borrowal
        });
    } catch (err) {
        console.error('Get borrowal error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Read - Get all borrowals with aggregation
const getAllBorrowals = async (req, res) => {
    try {
        const borrowals = await Borrowal.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "memberId",
                    foreignField: "_id",
                    as: "member"
                }
            },
            {
                $unwind: "$member"
            },
            {
                $lookup: {
                    from: "books",
                    localField: "bookId",
                    foreignField: "_id",
                    as: "book"
                }
            },
            {
                $unwind: "$book"
            },
            {
                $lookup: {
                    from: "authors",
                    localField: "book.authorId",
                    foreignField: "_id",
                    as: "book.author"
                }
            },
            {
                $unwind: {
                    path: "$book.author",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: { borrowedDate: -1 } // Most recent first
            }
        ]);

        return res.status(200).json({
            success: true,
            borrowalsList: borrowals
        });
    } catch (err) {
        console.error('Get all borrowals error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Create - Add new borrowal and mark book as unavailable
const addBorrowal = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowalData = {
            ...req.body,
            memberId: new mongoose.Types.ObjectId(req.body.memberId),
            bookId: new mongoose.Types.ObjectId(req.body.bookId),
            // Set default status if not provided or empty
            status: req.body.status && req.body.status.trim() !== '' ? req.body.status : 'borrowed'
        };

        // Check if book exists and is available
        const book = await Book.findById(borrowalData.bookId).session(session);
        if (!book) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Book not found"
            });
        }

        if (!book.isAvailable) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Book is not available for borrowing"
            });
        }

        // Check if user exists
        const user = await User.findById(borrowalData.memberId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if user has any overdue books
        const overdueBooks = await Borrowal.countDocuments({
            memberId: borrowalData.memberId,
            status: 'overdue'
        }).session(session);

        if (overdueBooks > 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Cannot borrow books while having overdue items"
            });
        }

        // Create borrowal
        const [borrowal] = await Borrowal.create([borrowalData], { session });

        // Mark book as unavailable
        await Book.findByIdAndUpdate(
            borrowalData.bookId,
            { isAvailable: false },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        // Populate the created borrowal for response
        const populatedBorrowal = await Borrowal.findById(borrowal._id)
            .populate('memberId', 'name email photoUrl')
            .populate('bookId', 'name isbn photoUrl');

        return res.status(201).json({
            success: true,
            newBorrowal: populatedBorrowal
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('Add borrowal error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Update - Update borrowal
const updateBorrowal = async (req, res) => {
    try {
        const borrowalId = req.params.id;
        const updateData = { ...req.body };

        const borrowal = await Borrowal.findById(borrowalId);
        if (!borrowal) {
            return res.status(404).json({
                success: false,
                message: "Borrowal not found"
            });
        }

        // If ObjectIds are being updated, convert them
        if (updateData.memberId) {
            updateData.memberId = new mongoose.Types.ObjectId(updateData.memberId);
        }
        if (updateData.bookId) {
            updateData.bookId = new mongoose.Types.ObjectId(updateData.bookId);
        }

        // Handle empty status
        if (updateData.status === '') {
            delete updateData.status;
        }

        const updatedBorrowal = await Borrowal.findByIdAndUpdate(
            borrowalId,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('memberId', 'name email photoUrl')
            .populate('bookId', 'name isbn photoUrl');

        return res.status(200).json({
            success: true,
            updatedBorrowal
        });
    } catch (err) {
        console.error('Update borrowal error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Return book - Mark borrowal as returned and book as available
const returnBook = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowalId = req.params.id;

        const borrowal = await Borrowal.findById(borrowalId).session(session);
        if (!borrowal) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Borrowal not found"
            });
        }

        if (borrowal.status === 'returned') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Book already returned"
            });
        }

        // Calculate fine if overdue
        const fine = borrowal.calculateFine();

        // Update borrowal
        borrowal.status = 'returned';
        borrowal.returnedDate = new Date();
        borrowal.fine = fine;
        await borrowal.save({ session });

        // Mark book as available
        await Book.findByIdAndUpdate(
            borrowal.bookId,
            { isAvailable: true },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        const populatedBorrowal = await Borrowal.findById(borrowal._id)
            .populate('memberId', 'name email photoUrl')
            .populate('bookId', 'name isbn photoUrl');

        return res.status(200).json({
            success: true,
            message: fine > 0 ? `Book returned with fine: $${fine}` : "Book returned successfully",
            returnedBorrowal: populatedBorrowal,
            fine
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('Return book error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Delete - Delete borrowal and mark book as available
const deleteBorrowal = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowalId = req.params.id;

        const borrowal = await Borrowal.findById(borrowalId).session(session);
        if (!borrowal) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Borrowal not found"
            });
        }

        // Mark book as available if not already returned
        if (borrowal.status !== 'returned') {
            await Book.findByIdAndUpdate(
                borrowal.bookId,
                { isAvailable: true },
                { session }
            );
        }

        const deletedBorrowal = await Borrowal.findByIdAndDelete(borrowalId).session(session);

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Borrowal deleted successfully",
            deletedBorrowal
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('Delete borrowal error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Get borrowals by member
const getMemberBorrowals = async (req, res) => {
    try {
        const memberId = req.params.memberId;

        const borrowals = await Borrowal.find({ memberId })
            .populate('bookId', 'name isbn photoUrl authorId')
            .populate({
                path: 'bookId',
                populate: {
                    path: 'authorId',
                    select: 'name'
                }
            })
            .sort({ borrowedDate: -1 });

        return res.status(200).json({
            success: true,
            borrowalsList: borrowals
        });
    } catch (err) {
        console.error('Get member borrowals error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Get overdue borrowals
const getOverdueBorrowals = async (req, res) => {
    try {
        const overdueBorrowals = await Borrowal.find({
            status: 'overdue'
        })
            .populate('memberId', 'name email phone')
            .populate('bookId', 'name isbn')
            .sort({ dueDate: 1 }); // Oldest overdue first

        return res.status(200).json({
            success: true,
            overdueBorrowalsList: overdueBorrowals
        });
    } catch (err) {
        console.error('Get overdue borrowals error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

// Get borrowal statistics
const getBorrowalStats = async (req, res) => {
    try {
        const stats = await Borrowal.aggregate([
            {
                $facet: {
                    statusCounts: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    totalFines: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: '$fine' }
                            }
                        }
                    ],
                    recentBorrowals: [
                        { $sort: { borrowedDate: -1 } },
                        { $limit: 5 },
                        {
                            $lookup: {
                                from: "users",
                                localField: "memberId",
                                foreignField: "_id",
                                as: "member"
                            }
                        },
                        {
                            $lookup: {
                                from: "books",
                                localField: "bookId",
                                foreignField: "_id",
                                as: "book"
                            }
                        }
                    ]
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            stats: stats[0]
        });
    } catch (err) {
        console.error('Get borrowal stats error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

module.exports = {
    getBorrowal,
    getAllBorrowals,
    addBorrowal,
    updateBorrowal,
    deleteBorrowal,
    returnBook,
    getMemberBorrowals,
    getOverdueBorrowals,
    getBorrowalStats
};