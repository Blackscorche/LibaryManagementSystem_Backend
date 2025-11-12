// Authentication middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ 
    success: false, 
    message: "Unauthorized. Please log in." 
  });
};

// Authorization middleware to check if user can access/modify a resource
const isAuthorized = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ 
      success: false, 
      message: "Unauthorized. Please log in." 
    });
  }

  const userId = req.params.id || req.body.userId;
  const authenticatedUserId = req.user?.id || req.user?._id?.toString();

  // Allow admins to access any user's data
  if (req.user?.isAdmin) {
    return next();
  }

  // Check if the authenticated user matches the requested user ID
  if (userId && authenticatedUserId && userId !== authenticatedUserId) {
    return res.status(403).json({ 
      success: false, 
      message: "Forbidden. You can only access your own data." 
    });
  }

  return next();
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ 
      success: false, 
      message: "Unauthorized. Please log in." 
    });
  }

  if (!req.user?.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: "Forbidden. Admin access required." 
    });
  }

  return next();
};

module.exports = {
  isAuthenticated,
  isAuthorized,
  isAdmin
};

