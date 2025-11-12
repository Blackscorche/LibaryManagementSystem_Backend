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
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost
    if (process.env.NODE_ENV !== "production") {
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return callback(null, true);
      }
    }
    
    // In production, only allow specified origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
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

app.listen(PORT, () => console.log(`Server listening on port ${PORT}!`));
