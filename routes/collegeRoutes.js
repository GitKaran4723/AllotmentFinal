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

  db.query("SELECT * FROM dummy_college WHERE college_code = ?", [college_code], async (err, results) => {
    if (err) return res.status(500).send("Database error");

    if (results.length === 0) {
      return res.render("college_login", { error: "❌ Invalid college code" });
    }

    const college = results[0];

    if (!college.password) {
      if (password === college_code) {
        db.query("SELECT college_id FROM College WHERE college_code = ?", [college_code], (err, collegeResults) => {
          if (err) return res.status(500).send("Database error fetching college_id");

          req.session.college = {
            ...college,
            college_id: collegeResults.length ? collegeResults[0].college_id : null
          };

          return res.redirect("/college/set-password");
        });
      } else {
        return res.render("college_login", { error: "❌ Invalid password" });
      }
      return;
    }

    const match = await bcrypt.compare(password, college.password);
    if (match) {
      db.query("SELECT college_id FROM College WHERE college_code = ?", [college_code], (err, collegeResults) => {
        if (err) return res.status(500).send("Database error fetching college_id");

        req.session.college = {
          ...college,
          college_id: collegeResults.length ? collegeResults[0].college_id : null
        };

        return res.redirect("/college/dashboard");
      });
    } else {
      return res.render("college_login", { error: "❌ Incorrect password" });
    }
  });
});


// ensure college login
function ensureCollegeLoggedIn(req, res, next) {
  if (req.session.college) {
    next();
  } else {
    res.redirect('/college/login'); // or your actual login route
  }
}

// Password Setup Page
router.get("/set-password", (req, res) => {
  if (!req.session.college) return res.redirect("/college/login");
  res.render("set_password");
});

// Handle New Password
router.post("/set-password", async (req, res) => {
  if (!req.session.college) return res.redirect("/college/login");

  const { new_password } = req.body;

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

// College Profile Page
router.get('/profile/:id', ensureCollegeLoggedIn, (req, res) => {

  const profileCollegeId = req.params.id;
  const loggedInCollegeCode = req.session.college.college_code;

  const query = `
    SELECT c.*, d.college_name 
    FROM College c 
    JOIN dummy_college d ON c.college_code = d.college_code 
    WHERE c.college_id = ? AND c.college_code = ?
  `;

  db.query(
    query,
    [profileCollegeId, loggedInCollegeCode],
    (err, results) => {
      if (err) {
        console.error("Database Error: ", err);
        return res.status(500).send("Internal Server Error");
      }

      if (!results.length) {
        return res.status(403).send("Unauthorized access");
      }

      res.render('college/college_profile', { college: results[0] });
    }
  );
});


// Show Edit Profile Page
router.get('/edit/:id', ensureCollegeLoggedIn, (req, res) => {
  const collegeId = req.params.id;

  if (req.session.college.college_id != collegeId) {
    return res.status(403).send("Unauthorized access");
  }

  db.query('SELECT * FROM College WHERE college_id = ?', [collegeId], (err, results) => {
    if (err) return res.status(500).send("Database error" , err);

    if (!results.length) return res.status(404).send("College not found");

    res.render('college/edit_college_profile', { college: results[0] });
  });
});

// Handle Profile Update
router.post('/update/:id', ensureCollegeLoggedIn, (req, res) => {
  const collegeId = req.params.id;

  if (req.session.college.college_id != collegeId) {
    return res.status(403).send("Unauthorized update attempt");
  }

  const { college_address, college_pincode, college_hod, hod_phone } = req.body;

  db.query(
    'UPDATE College SET college_address = ?, college_pincode = ?, college_hod = ?, hod_phone = ? WHERE college_id = ?',
    [college_address, college_pincode, college_hod, hod_phone, collegeId],
    (err) => {
      if (err) return res.status(500).send("Database update error");

      res.redirect(`/college/profile/${collegeId}`);
    }
  );
});


// Logout
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/college/login");
});

module.exports = router;
