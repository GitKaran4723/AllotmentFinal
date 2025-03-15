const express = require("express");
const router = express.Router();
const db = require("../config/db").promise(); // Ensure this is your MySQL DB connection
const session = require("express-session");

// Enable session middleware (only once in your main app file)
router.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to `true` if using HTTPS
}));

// Route to display the contact page
router.get("/", (req, res) => {
    res.render("contact", { 
        successMessage: req.session.successMessage || null, 
        errorMessage: req.session.errorMessage || null 
    });

    // Clear session messages after rendering
    req.session.successMessage = null;
    req.session.errorMessage = null;
});

// Handle contact form submission
router.post("/", async (req, res) => {
    const { name, email, message } = req.body;

    try {
        // Insert into database
        await db.query(
            "INSERT INTO contact_details (name, email, message) VALUES (?, ?, ?)",
            [name, email, message]
        );

        // Store success message in session
        req.session.successMessage = "Your message has been received! We will get back to you soon.";

    } catch (error) {
        console.error("Database Error:", error);
        req.session.errorMessage = "Failed to send message. Please try again.";
    }

    // Redirect back to the contact page
    res.redirect("/contact");
});

module.exports = router;
