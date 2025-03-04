require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const genAIService = require("./services/genAIService");
const db = require("./config/db");
const cors = require("cors");
const session = require("express-session");
const collegeRoutes = require("./routes/collegeRoutes");

const app = express();
const port = 3000;

app.use(cors());

// Set EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files (CSS, images, JS)
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



app.use(session({
  secret: process.env.SESSION_SECRET || "your_secret_key",
  resave: false,
  saveUninitialized: false,
}));

app.use("/college", collegeRoutes);

let storedContent = "";
const githubUrl =
  "https://raw.githubusercontent.com/Monisha-07590/bcadata/refs/heads/main/projectdata"; // Replace with actual URL

// Function to fetch and update content from GitHub
const fetchGitHubContent = async () => {
  try {
    const response = await axios.get(githubUrl);
    storedContent = response.data;
    console.log("GitHub content updated successfully");
  } catch (error) {
    console.error("Error fetching GitHub content:", error);
  }
};

// Initial fetch on server startup
fetchGitHubContent();
setInterval(fetchGitHubContent, 5 * 60 * 1000); // Refresh every 5 minutes

const logDir = path.join(__dirname, "..", "chatLogs"); // Moves the logs folder one level up
const logFilePath = path.join(logDir, "logs.json");

// Ensure the log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Function to log questions and responses to the log file
const logToFile = (question, responseText) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    question: question,
    response: responseText,
  };

  fs.appendFile(
    logFilePath,
    JSON.stringify(logEntry, null, 2) + ",\n",
    (err) => {
      if (err) console.error("Error writing to log file:", err);
    }
  );
};

// API to process user questions using stored content
app.post("/ask-gemini", async (req, res) => {
  try {
    const userQuestion = req.body.question;
    if (!userQuestion) {
      return res.status(400).json({ error: "Question is required" });
    }

    // Process user question with stored content using GenAI service
    const responseText = await genAIService.processQuestion(
      storedContent,
      userQuestion
    );

    // Log question and response
    logToFile(userQuestion, responseText);

    res.json({ response: responseText });
  } catch (error) {
    console.error("Error processing user question:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// API to fetch chat logs
app.get("/fetch_chats", (req, res) => {
  fs.readFile(logFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading log file:", err);
      return res.status(500).json({ error: "Failed to retrieve logs" });
    }
    res.send(`<pre>${data}</pre>`);
  });
});

// Simple route
app.get("/", (req, res) => {
  res.render("index", { title: "Home | My Website" });
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/features", (req, res) => {
  res.render("features");
});

app.get("/contact", (req, res) => {
  res.render("contact");
});

// Fetch data from database
app.get("/college", (req, res) => {
  db.query("SELECT * FROM College", (err, results) => {
    if (err) {
      res.status(500).send("Error fetching colleges");
      return;
    }
    res.json(results);
  });
});

app.get("/teacher", (req, res) => {
  db.query("SELECT * FROM Teacher", (err, results) => {
    if (err) {
      res.status(500).send("Error fetching teachers");
      return;
    }
    res.json(results);
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
