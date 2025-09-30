
// 2. Updated Member Controller
const Member = require('../models/member');
const { cloudinary } = require('../config/cloudinary');

const getMember = async (req, res) => {
    try {
        const memberId = req.params.id;
        const member = await Member.findById(memberId);

        if (!member) {
            return res.status(404).json({ success: false, message: "Member not found" });
        }

        return res.status(200).json({
            success: true,
            member
        });
    } catch (err) {
        return res.status(400).json({ success: false, err });
    }
};

const getAllMembers = async (req, res) => {
    try {
        const members = await Member.find({});
        return res.status(200).json({
            success: true,
            membersList: members
        });
    } catch (err) {
        return res.status(400).json({ success: false, err });
    }
};

const addMember = async (req, res) => {
    try {
        const memberData = { ...req.body };

        // Add photo if uploaded
        if (req.file) {
            memberData.photoUrl = {
                url: req.file.path,
                publicId: req.file.filename
            };
        }

        const member = await Member.create(memberData);

        return res.status(200).json({
            success: true,
            newMember: member
        });
    } catch (err) {
        // Clean up uploaded file if member creation fails
        if (req.file) {
            await cloudinary.uploader.destroy(req.file.filename);
        }
        return res.status(400).json({ success: false, err });
    }
};

const updateMember = async (req, res) => {
    try {
        const memberId = req.params.id;
        const updateData = { ...req.body };

        const member = await Member.findById(memberId);
        if (!member) {
            if (req.file) {
                await cloudinary.uploader.destroy(req.file.filename);
            }
            return res.status(404).json({ success: false, message: "Member not found" });
        }

        // Handle photo update
        if (req.file) {
            // Delete old photo if it exists
            if (member.photoUrl && member.photoUrl.publicId) {
                await cloudinary.uploader.destroy(member.photoUrl.publicId);
            }

            updateData.photoUrl = {
                url: req.file.path,
                publicId: req.file.filename
            };
        }

        const updatedMember = await Member.findByIdAndUpdate(
            memberId,
            updateData,
            { new: true }
        );

        return res.status(200).json({
            success: true,
            updatedMember
        });
    } catch (err) {
        if (req.file) {
            await cloudinary.uploader.destroy(req.file.filename);
        }
        return res.status(400).json({ success: false, err });
    }
};

const deleteMember = async (req, res) => {
    try {
        const memberId = req.params.id;

        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: "Member not found" });
        }

        // Delete photo from Cloudinary if it exists
        if (member.photoUrl && member.photoUrl.publicId) {
            await cloudinary.uploader.destroy(member.photoUrl.publicId);
        }

        const deletedMember = await Member.findByIdAndDelete(memberId);

        return res.status(200).json({
            success: true,
            deletedMember
        });
    } catch (err) {
        return res.status(400).json({ success: false, err });
    }
};

module.exports = {
    getMember,
    getAllMembers,
    addMember,
    updateMember,
    deleteMember
};

// 3. Add to Cloudinary config
const memberPhotoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'library_system/members',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [
            { width: 300, height: 300, crop: 'fill' },
            { quality: 'auto' }
        ]
    },
});

const uploadMemberPhoto = multer({
    storage: memberPhotoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Export it
module.exports = {
    cloudinary,
    uploadProfile,
    uploadBookCover,
    uploadAuthorPhoto,
    uploadMemberPhoto
};