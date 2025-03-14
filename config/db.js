const mysql = require("mysql2");

// Create a MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10, // Adjust based on load
  queueLimit: 0,
});

// Function to check and reconnect if needed
function handleDisconnect() {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("Database connection failed. Retrying in 5 seconds...", err);
      setTimeout(handleDisconnect, 5000); // Retry after 5 seconds
    } else {
      console.log("Reconnected to MySQL database.");
      connection.release(); // Release connection after checking
    }
  });
}

// Periodically check and reconnect if needed
setInterval(handleDisconnect, 10 * 60 * 1000); // Run every 10 minutes

// Test initial connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("Initial database connection failed:", err);
  } else {
    console.log("Connected to MySQL database.");
    connection.release(); // Release connection back to pool
  }
});

module.exports = db;
