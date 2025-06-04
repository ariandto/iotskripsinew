// Importing all required packages
const router = require("express").Router();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const db = require("../../db/db");

// Serialize user for session management
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Configuring Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID, // Google Client ID
      clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Google Client Secret
      callbackURL: "http://localhost:8100/auth/google/callback", // Redirect URI
    },
    (accessToken, refreshToken, profile, done) => {
      console.log("Google Profile:", profile); // Debugging

      const { id, displayName, emails, photos } = profile;
      const userEmail = emails[0]?.value;
      const userImg = photos[0]?.value;

      // Check if the user already exists
      db.query("SELECT * FROM users WHERE googleId = ?", [id], (err, user) => {
        if (err) return done(err, false);

        if (user.length > 0) {
          return done(null, user[0]); // User exists, return user
        } else {
          // Insert new user into the database
          db.query(
            "INSERT INTO users (userName, googleId, userEmail, userImg) VALUES (?, ?, ?, ?)",
            [displayName, id, userEmail, userImg],
            (err, result) => {
              if (err) return done(err, false);
              return done(null, {
                id,
                userName: displayName,
                userEmail,
                userImg,
              });
            }
          );
        }
      });
    }
  )
);

// Route to authenticate with Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback route
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    if (req.user) {
      console.log("Authenticated User:", req.user);

      // Generate JWT token
      const googleAuthToken = jwt.sign(
        { googleId: req.user.googleId },
        process.env.JWT_SECRET || "default_secret_key",
        { expiresIn: "1d" }
      );

      // Set JWT token as a cookie
      res.cookie("googleAuthToken", googleAuthToken, {
        expires: new Date(Date.now() + 86400 * 1000),
        httpOnly: true,
      });

      // Redirect to frontend
      res.redirect("http://localhost:5173");
    } else {
      res.status(401).json({ error: "Authentication failed" });
    }
  }
);

// Login success route
router.get("/login/success", (req, res) => {
  if (req.user) {
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        userName: req.user.userName,
        userEmail: req.user.userEmail,
        userImg: req.user.userImg,
      },
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// Logout route
router.get("/logout", (req, res) => {
  try {
    // Hapus cookie yang menyimpan token JWT
    res.clearCookie("googleAuthToken");

    // Jika menggunakan session, pastikan logout dilakukan
    req.logout((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).json({ error: "Logout failed" });
      }

      console.log("User logged out successfully");
      res.json({ success: true, message: "Logged out successfully" });
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Something went wrong during logout" });
  }
});

module.exports = router;
