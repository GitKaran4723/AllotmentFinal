require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const genAIService = require("./services/genAIService");
const db = require("./config/db").promise();
const cors = require("cors");
const session = require("express-session");
const collegeRoutes = require("./routes/collegeRoutes");
const subjects = require("./routes/subjects");
const contact = require("./routes/contact");

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

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// Middleware to log requests
const logDir = path.join(__dirname, "logs");
const requestLogFile = path.join(logDir, "requests.log");

// Ensure the logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

app.use((req, res, next) => {
  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  // If behind a proxy, extract the first IP (client's real IP)
  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  // Convert IPv6-mapped IPv4 addresses
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  // Convert timestamp to Indian Standard Time (IST)
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // Convert UTC to IST
  const formattedTime =
    istTime.toISOString().replace("T", " ").split(".")[0] + " IST";

  const logEntry = `[${formattedTime}] ${ip} ${req.method} ${req.url}\n`;

  fs.appendFile(requestLogFile, logEntry, (err) => {
    if (err) console.error("❌ Error logging request:", err);
  });

  console.log(logEntry.trim()); // Log to console
  next();
});

app.use("/college", collegeRoutes);
app.use("/subjects", subjects);
app.use("/contact", contact);

let storedContent = "";
const githubUrl =
  "https://raw.githubusercontent.com/Monisha-07590/bcadata/refs/heads/main/projectdata";

// Function to fetch and update content from GitHub with retry logic
const fetchGitHubContent = async (retryCount = 3) => {
  while (retryCount > 0) {
    try {
      const response = await axios.get(githubUrl);
      storedContent = response.data;
      console.log("✅ GitHub content updated successfully");
      return;
    } catch (error) {
      console.error(
        `❌ Error fetching GitHub content (Attempts left: ${retryCount}):`,
        error
      );
      retryCount--;
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
    }
  }
};

// Initial fetch on server startup
fetchGitHubContent();
setInterval(fetchGitHubContent, 10 * 60 * 1000); // Refresh every 10 minutes

const chatLogDir = path.join(__dirname, "..", "chatLogs");
const logFilePath = path.join(chatLogDir, "logs.json");

// Ensure the chat log directory exists
if (!fs.existsSync(chatLogDir)) {
  fs.mkdirSync(chatLogDir, { recursive: true });
}

// Function to log questions and responses
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
      if (err) console.error("❌ Error writing to chat log file:", err);
    }
  );
};

// API to process user questions using stored content
app.post("/ask-gemini", async (req, res) => {
  try {
    const userQuestion = req.body.question;
    if (!userQuestion) {
      return res.status(400).json({ error: "❌ Question is required" });
    }

    const responseText = await genAIService.processQuestion(
      storedContent,
      userQuestion
    );
    logToFile(userQuestion, responseText);

    res.json({ response: responseText });
  } catch (error) {
    console.error("❌ Error processing user question:", error);
    res.status(500).json({ error: "❌ Internal server error" });
  }
});

// API to fetch chat logs
app.get("/fetch_chats", (req, res) => {
  fs.readFile(logFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("❌ Error reading log file:", err);
      return res.status(500).json({ error: "❌ Failed to retrieve logs" });
    }
    res.send(`<pre>${data}</pre>`);
  });
});

// Simple routes
app.get("/", (req, res) => res.render("index", { title: "Home | My Website" }));
app.get("/about", (req, res) => res.render("about"));

app.get("/contact", (req, res) => res.render("contact"));

// Serve the Terms & Conditions Page
app.get("/terms", (req, res) => {
  res.render("terms");
});

// Serve the privacy
app.get("/privacy-policy", (req, res) => {
  res.render("privacy_policy");
});

// Fetch data from database
app.get("/college", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM College");
    res.json(results);
  } catch (error) {
    console.error("❌ Database Error fetching colleges:", error);
    res.status(500).json({ error: "❌ Database Error fetching colleges" });
  }
});

app.get("/teacher", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM Teacher");
    res.json(results);
  } catch (error) {
    console.error("❌ Database Error fetching teachers:", error);
    res.status(500).json({ error: "❌ Database Error fetching teachers" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
