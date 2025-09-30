const User = require('../models/user');
const passport = require("passport");
const { cloudinary } = require('../config/cloudinary');

const registerUser = async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      // If profile picture was uploaded but user exists, delete it
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(403).json({ success: false, message: "User already exists" });
    }

    const userData = { ...req.body };

    // Add profile picture URL if uploaded
    if (req.file) {
      userData.profilePicture = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    const newUser = new User(userData);
    newUser.setPassword(req.body.password);

    const savedUser = await newUser.save();

    // Remove sensitive fields from response
    const userResponse = savedUser.toObject();
    delete userResponse.hash;
    delete userResponse.salt;

    return res.status(201).json({
      success: true,
      user: userResponse
    });

  } catch (err) {
    // Clean up uploaded file if user creation fails
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    console.error('Registration error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

// Update user profile with new picture
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you have user in req from auth middleware
    const updateData = { ...req.body };

    const user = await User.findById(userId);
    if (!user) {
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Handle profile picture update
    if (req.file) {
      // Delete old profile picture if it exists
      if (user.profilePicture && user.profilePicture.publicId) {
        await cloudinary.uploader.destroy(user.profilePicture.publicId);
      }

      updateData.profilePicture = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    // Remove sensitive fields
    const userResponse = updatedUser.toObject();
    delete userResponse.hash;
    delete userResponse.salt;

    return res.status(200).json({
      success: true,
      user: userResponse
    });

  } catch (err) {
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    console.error('Profile update error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

// Delete user profile picture
const deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.profilePicture && user.profilePicture.publicId) {
      await cloudinary.uploader.destroy(user.profilePicture.publicId);

      user.profilePicture = undefined;
      await user.save();
    }

    const userResponse = user.toObject();
    delete userResponse.hash;
    delete userResponse.salt;

    return res.status(200).json({
      success: true,
      message: "Profile picture deleted",
      user: userResponse
    });

  } catch (err) {
    console.error('Delete profile picture error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const loginUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.salt || !user.hash) {
      return res.status(400).json({
        success: false,
        message: "Account needs password reset. Please contact administrator."
      });
    }

    if (!user.isValidPassword(req.body.password)) {
      return res.status(401).json({ success: false, message: "Password incorrect" });
    }

    passport.authenticate("local", (err, authenticatedUser, info) => {
      if (err) {
        console.error('Passport authentication error:', err);
        return next(err);
      }

      if (!authenticatedUser) {
        return res.status(401).json({ success: false, message: "Authentication failed" });
      }

      req.logIn(authenticatedUser, (err) => {
        if (err) {
          console.error('Login error:', err);
          return next(err);
        }

        const userResponse = authenticatedUser.toObject();
        delete userResponse.hash;
        delete userResponse.salt;

        return res.status(200).json({
          success: true,
          user: userResponse
        });
      });
    })(req, res, next);

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const logoutUser = async (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return next(err);
    }
    return res.status(200).json({ success: true, message: "User logged out" });
  });
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  updateUserProfile,
  deleteProfilePicture
};
