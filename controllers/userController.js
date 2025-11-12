const User = require('../models/user');
const { cloudinary } = require('../config/cloudinary');

const getUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Remove sensitive fields
    const userResponse = user.toObject();
    delete userResponse.hash;
    delete userResponse.salt;

    return res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (err) {
    return res.status(400).json({ success: false, err });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});

    // Remove sensitive fields
    const usersResponse = users.map(user => {
      const userObj = user.toObject();
      delete userObj.hash;
      delete userObj.salt;
      return userObj;
    });

    return res.status(200).json({
      success: true,
      usersList: usersResponse
    });
  } catch (err) {
    return res.status(400).json({ success: false, err });
  }
};

const getAllMembers = async (req, res) => {
  try {
    const members = await User.find({ isAdmin: false });

    // Remove sensitive fields
    const membersResponse = members.map(member => {
      const memberObj = member.toObject();
      delete memberObj.hash;
      delete memberObj.salt;
      return memberObj;
    });

    return res.status(200).json({
      success: true,
      membersList: membersResponse
    });
  } catch (err) {
    return res.status(400).json({ success: false, err });
  }
};

const addUser = async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(403).json({ success: false, message: "User already exists" });
    }

    const userData = { ...req.body };

    // Add photo if uploaded
    if (req.file) {
      userData.photoUrl = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    const newUser = new User(userData);
    newUser.setPassword(req.body.password);
    const savedUser = await newUser.save();

    // Remove sensitive fields
    const userResponse = savedUser.toObject();
    delete userResponse.hash;
    delete userResponse.salt;

    return res.status(201).json({
      success: true,
      user: userResponse
    });
  } catch (err) {
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    return res.status(400).json({ success: false, err });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = { ...req.body };

    // Authorization check: prevent user impersonation
    if (!req.user) {
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
    }

    const authenticatedUserId = req.user.id || req.user._id?.toString();
    
    // Allow admins to update any user, but regular users can only update themselves
    if (!req.user.isAdmin && userId !== authenticatedUserId) {
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden. You can only update your own profile." 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Handle photo update
    if (req.file) {
      // Delete old photo if it exists
      if (user.photoUrl && user.photoUrl.publicId) {
        await cloudinary.uploader.destroy(user.photoUrl.publicId);
      }

      updateData.photoUrl = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    // Update password if provided
    if (req.body.password) {
      user.setPassword(req.body.password);
      updateData.hash = user.hash;
      updateData.salt = user.salt;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    // Remove sensitive fields
    const userResponse = updatedUser.toObject();
    delete userResponse.hash;
    delete userResponse.salt;

    return res.status(200).json({
      success: true,
      updatedUser: userResponse
    });
  } catch (err) {
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    return res.status(400).json({ success: false, err });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Authorization check: prevent user impersonation
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
    }

    const authenticatedUserId = req.user.id || req.user._id?.toString();
    
    // Allow admins to delete any user, but regular users can only delete themselves
    if (!req.user.isAdmin && userId !== authenticatedUserId) {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden. You can only delete your own account." 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Delete photo from Cloudinary if it exists
    if (user.photoUrl && user.photoUrl.publicId) {
      await cloudinary.uploader.destroy(user.photoUrl.publicId);
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    // Remove sensitive fields
    const userResponse = deletedUser.toObject();
    delete userResponse.hash;
    delete userResponse.salt;

    return res.status(200).json({
      success: true,
      deletedUser: userResponse
    });
  } catch (err) {
    return res.status(400).json({ success: false, err });
  }
};

module.exports = {
  getUser,
  getAllUsers,
  getAllMembers,
  addUser,
  updateUser,
  deleteUser
};

// Routes usage:
// const { uploadProfile } = require('../config/cloudinary');
// router.post('/', uploadProfile.single('photoUrl'), addUser);
// router.put('/:id', uploadProfile.single('photoUrl'), updateUser);