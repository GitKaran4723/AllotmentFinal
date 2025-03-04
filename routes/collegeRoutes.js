const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../config/db"); // Adjust if your DB connection is elsewhere

// College Login Page
router.get("/login", (req, res) => {
  res.render("college_login");
});

// Handle Login
router.post("/login", (req, res) => {
  const { college_code, password } = req.body;

  console.log("Details ",college_code )
  console.log("Details ",password )

  db.query("SELECT * FROM dummy_college WHERE college_code = ?", [college_code], async (err, results) => {
    if (err) return res.status(500).send("Database error");

    if (results.length === 0) return res.status(400).send("Invalid college code");

    const college = results[0];

    console.log("Colleg fetched", college);

    if (!college.password) {
      if (password === college_code) {
        req.session.college = college;
        console.log("in sesssion value",req.session.college);
        return res.redirect("/college/set-password");
      } else {
        return res.status(400).send("Invalid password");
      }
    }

    const match = await bcrypt.compare(password, college.password);
    if (match) {
      req.session.college = college;
      return res.redirect("/college/dashboard");
    } else {
      return res.status(400).send("Incorrect password");
    }
  });
});

// Password Setup Page
router.get("/set-password", (req, res) => {
  if (!req.session.college) return res.redirect("/college/login");
  res.render("set_password");
});

// Handle New Password
router.post("/set-password", async (req, res) => {
  if (!req.session.college) return res.redirect("/college/login");

  const { new_password } = req.body;
  console.log("Set password", new_password);
  console.log("Set password", req.session.college.college_code);
  const hashedPassword = await bcrypt.hash(new_password, 10);

  db.query(
    "UPDATE dummy_college SET password = ? WHERE college_code = ?",
    [hashedPassword, req.session.college.college_code],
    (err) => {
      if (err) return res.status(500).send("Failed to set password");

      req.session.college.password = hashedPassword;
      res.redirect("/college/dashboard");
    }
  );
});

// College Dashboard
router.get("/dashboard", (req, res) => {
  if (!req.session.college) return res.redirect("/college/login");
  res.render("college_dashboard", { college: req.session.college });
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/college/login");
});

module.exports = router;
