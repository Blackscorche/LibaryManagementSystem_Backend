// Import required modules
const express = require('express');
const cors = require('cors');
const logger = require('morgan')
const passport = require("passport");
const session = require("express-session");
const cookieParser = require("cookie-parser");
require('dotenv').config();

// Import routers
const authRouter = require("./routes/authRouter")
const bookRouter = require("./routes/bookRouter")
const authorRouter = require("./routes/authorRouter")
const borrowalRouter = require("./routes/borrowalRouter")
const genreRouter = require("./routes/genreRouter")
const userRouter = require("./routes/userRouter")
const reviewRouter = require("./routes/reviewRouter")

// Configure dotenv for environment variables in production
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Setup express
const app = express();
const PORT = process.env.PORT || 8080

// Use morgan for logging
app.use(logger("dev"))

// Set middleware to process form data
app.use(express.urlencoded({ extended: false }));

// Connect to DB
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Connected to DB on MongoDB Atlas')
  })
  .catch((err) => console.log('DB connection error', err));

// Use CORS for Cross Origin Resource Sharing
// Support multiple frontend URLs (comma-separated)
// Normalize URLs by removing trailing slashes for consistent matching
const frontendUrls = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/+$/, ''))
  : [];

const allowedOrigins = [
  "http://localhost:3000",
  ...frontendUrls
].filter(Boolean); // Remove undefined values

// Log allowed origins in production for debugging
if (process.env.NODE_ENV === "production") {
  console.log('Allowed CORS origins:', allowedOrigins);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Normalize origin by removing trailing slash
    const normalizedOrigin = origin.replace(/\/+$/, '');
    
    // In development, allow localhost
    if (process.env.NODE_ENV !== "production") {
      if (normalizedOrigin.includes("localhost") || normalizedOrigin.includes("127.0.0.1")) {
        return callback(null, true);
      }
    }
    
    // Check if normalized origin is in allowed list
    if (allowedOrigins.indexOf(normalizedOrigin) !== -1) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.warn('CORS: Origin not allowed:', normalizedOrigin);
    console.warn('CORS: Allowed origins:', allowedOrigins);
    
    // Return error with proper CORS headers
    callback(new Error(`Not allowed by CORS. Origin: ${normalizedOrigin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}))

// Set middleware to manage sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production (HTTPS only)
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax" // Required for cross-origin in production
    }
  })
);

// Parse cookies used for session management
app.use(cookieParser(process.env.SESSION_SECRET));

// Parse JSON objects in request bodies
app.use(express.json())

// Use passport authentication middleware
app.use(passport.initialize());
app.use(passport.session());

// Initialise passport as authentication middleware
const initializePassport = require("./passport-config");
initializePassport(passport);

// Implement routes for REST API
app.use("/api/auth", authRouter)
app.use("/api/book", bookRouter);
app.use("/api/author", authorRouter);
app.use("/api/borrowal", borrowalRouter);
app.use("/api/genre", genreRouter);
app.use("/api/user", userRouter);
app.use("/api/review", reviewRouter);

app.get('/', (req, res) => res.send('Welcome to Library Management System'));

// Error handling middleware - must be after all routes
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Error stack:', err.stack);
  
  // Handle CORS errors - must set CORS headers even for errors
  if (err.message && err.message.includes('Not allowed by CORS')) {
    // Set CORS headers for the error response
    const origin = req.headers.origin;
    if (origin && allowedOrigins.indexOf(origin) !== -1) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    return res.status(403).json({ 
      success: false, 
      error: 'CORS policy violation',
      message: err.message,
      requestedOrigin: origin,
      allowedOrigins: process.env.NODE_ENV === "production" ? undefined : allowedOrigins // Don't expose in production
    });
  }
  
  // Handle other errors
  res.status(err.status || 500).json({ 
    success: false, 
    error: err.message || 'Internal server error' 
  });
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}!`));
