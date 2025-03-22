const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const session = require("express-session");
const db = require("../config/db").promise(); // Use MySQL2's promise API

// College Login Page
router.get("/login", (req, res) => {
  res.render("college/college_login");
});

// Handle Login
router.post("/login", async (req, res) => {
  try {
    const { college_code, password } = req.body;
    if (!college_code || !password) {
      return res.render("college/college_login", {
        error: "❌ College Code and Password are required",
      });
    }

    const [results] = await db.query(
      "SELECT * FROM dummy_college WHERE college_code = ?",
      [college_code]
    );
    if (results.length === 0) {
      return res.render("college/college_login", {
        error: "❌ Invalid college code",
      });
    }

    const college = results[0];

    if (!college.password) {
      if (password === college_code) {
        const [collegeResults] = await db.query(
          "SELECT college_id FROM College WHERE college_code = ?",
          [college_code]
        );

        req.session.college = {
          ...college,
          college_id: collegeResults.length
            ? collegeResults[0].college_id
            : null,
        };

        return res.redirect("/college/set-password");
      } else {
        return res.render("college/college_login", {
          error: "❌ Invalid password",
        });
      }
    }

    const match = await bcrypt.compare(password, college.password);
    if (match) {
      const [collegeResults] = await db.query(
        "SELECT college_id FROM College WHERE college_code = ?",
        [college_code]
      );

      req.session.college = {
        ...college,
        college_id: collegeResults.length ? collegeResults[0].college_id : null,
      };

      return res.redirect("/college/dashboard");
    } else {
      return res.render("college/college_login", {
        error: "❌ Incorrect password",
      });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Ensure College Login
function ensureCollegeLoggedIn(req, res, next) {
  if (req.session.college) {
    return next();
  }
  res.redirect("/college/login");
}

// Password Setup Page
router.get("/set-password", ensureCollegeLoggedIn, (req, res) => {
  res.render("college/set_password");
});

// Handle New Password
router.post("/set-password", ensureCollegeLoggedIn, async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.render("college/set_password", {
        error: "❌ Password must be at least 6 characters",
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await db.query(
      "UPDATE dummy_college SET password = ? WHERE college_code = ?",
      [hashedPassword, req.session.college.college_code]
    );

    req.session.college.password = hashedPassword;
    res.redirect("/college/dashboard");
  } catch (error) {
    console.error("Password Update Error:", error);
    res.status(500).send("Failed to set password");
  }
});

// College Dashboard
router.get("/dashboard", ensureCollegeLoggedIn, (req, res) => {
  res.render("college/college_dashboard", { college: req.session.college });
});

// College Profile Page
router.get("/profile/:id", ensureCollegeLoggedIn, async (req, res) => {
  try {
    const profileCollegeId = req.params.id;
    const loggedInCollegeCode = req.session.college.college_code;

    const [results] = await db.query(
      `SELECT c.*, d.college_name FROM College c 
       JOIN dummy_college d ON c.college_code = d.college_code 
       WHERE c.college_id = ? AND c.college_code = ?`,
      [profileCollegeId, loggedInCollegeCode]
    );

    if (results.length === 0) {
      return res.status(403).send("Unauthorized access");
    }

    res.render("college/college_profile", { college: results[0] });
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Show Edit Profile Page
router.get("/edit/:id", ensureCollegeLoggedIn, async (req, res) => {
  try {
    const collegeId = req.params.id;
    if (req.session.college.college_id != collegeId) {
      return res.status(403).send("Unauthorized access");
    }

    const [collegeResults] = await db.query(
      "SELECT * FROM College WHERE college_id = ?",
      [collegeId]
    );
    if (collegeResults.length === 0) {
      return res.status(404).send("College not found");
    }

    const [pincodeResults] = await db.query(
      "SELECT pincode, area_name FROM bangalore_pincodes"
    );
    res.render("college/edit_college_profile", {
      college: collegeResults[0],
      pincodes: pincodeResults,
    });
  } catch (error) {
    console.error("Edit Profile Error:", error);
    res.status(500).send("Database error");
  }
});

// Handle Profile Update
router.post("/update/:id", ensureCollegeLoggedIn, async (req, res) => {
  try {
    const collegeId = req.params.id;
    if (req.session.college.college_id != collegeId) {
      return res.status(403).send("Unauthorized update attempt");
    }

    const { college_address, college_pincode, college_hod, hod_phone } =
      req.body;
    if (!college_address || !college_hod || !hod_phone) {
      return res.status(400).send("❌ All fields are required");
    }

    const [pincodeResults] = await db.query(
      "SELECT pincode FROM bangalore_pincodes WHERE pincode = ?",
      [college_pincode]
    );
    const validPincode = pincodeResults.length ? college_pincode : null;

    await db.query(
      "UPDATE College SET college_address = ?, college_pincode = ?, college_hod = ?, hod_phone = ? WHERE college_id = ?",
      [college_address, validPincode, college_hod, hod_phone, collegeId]
    );

    res.redirect(`/college/profile/${collegeId}`);
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).send("Database update error");
  }
});

//
router.post("/teacher/delete/:id", (req, res) => {
  const teacherId = req.params.id;

  const sql = `DELETE FROM Teacher WHERE teacher_id = ? AND approved = 'No'`;
  db.query(sql, [teacherId], (err, result) => {
    if (err) {
      console.error("Error deleting teacher:", err);
      return res.status(500).send("Database error");
    }
    res.redirect("/college/teacher/manage");
  });
});

// fetch college subjects
router.get("/subjects", async (req, res) => {
  try {
    const [subjects] = await db.query(
      "SELECT * FROM Subject ORDER BY subject_semester, subject_name"
    );

    // Group subjects by semester
    const subjectsBySemester = [];
    const semesterMap = new Map();

    subjects.forEach((subject) => {
      if (!semesterMap.has(subject.subject_semester)) {
        semesterMap.set(subject.subject_semester, {
          semester: subject.subject_semester,
          theorySubjects: [],
          practicalSubjects: [],
        });
      }

      if (subject.is_practical) {
        semesterMap
          .get(subject.subject_semester)
          .practicalSubjects.push(subject);
      } else {
        semesterMap.get(subject.subject_semester).theorySubjects.push(subject);
      }
    });

    subjectsBySemester.push(...semesterMap.values());

    // Render the page with the corrected data
    res.render("college/subjects", {
      subjectsBySemester,
      college: req.session.college,
    });
  } catch (err) {
    console.error("Database error:", err);
    res
      .status(500)
      .send("Error fetching subjects <strong>please Reload</strong>");
  }
});

// Route to display the contact page
router.get("/contact", ensureCollegeLoggedIn, (req, res) => {
  res.render("college/contact", {
    successMessage: req.session.successMessage || null,
    errorMessage: req.session.errorMessage || null,
    college: req.session.college,
  });

  // Clear session messages after rendering
  req.session.successMessage = null;
  req.session.errorMessage = null;
});

// Handle contact form submission in login
router.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    // Insert into database
    await db.query(
      "INSERT INTO contact_details (name, email, message) VALUES (?, ?, ?)",
      [name, email, message]
    );

    // Store success message in session
    req.session.successMessage =
      "Your message has been received! We will get back to you soon.";
  } catch (error) {
    console.error("Database Error:", error);
    req.session.errorMessage = "Failed to send message. Please try again.";
  }

  // Redirect back to the contact page
  res.redirect("/college/contact");
});

// Get all teachers from the logged-in college
router.get("/teacher/manage", ensureCollegeLoggedIn, async (req, res) => {
  const collegeId = req.session.college.college_id;

  console.log("College ID", collegeId);

  try {
    const [teachers] = await db.query(
      `SELECT 
        t.teacher_id, t.teacher_name, t.teacher_gender, t.teacher_phone, 
        t.teacher_address, t.teacher_pincode, t.approved, 
        GROUP_CONCAT(DISTINCT CONCAT_WS('|', s1.subject_name, s1.subject_semester) ORDER BY s1.subject_semester) AS practical_subjects,
        GROUP_CONCAT(DISTINCT CONCAT_WS('|', s2.subject_name, s2.subject_semester) ORDER BY s2.subject_semester) AS theory_subjects
      FROM Teacher t
      LEFT JOIN Practical_Exam_Specialization pe ON t.teacher_id = pe.teacher_id
      LEFT JOIN Subject s1 ON pe.subject_id = s1.subject_id
      LEFT JOIN Theory_Exam_Specialization te ON t.teacher_id = te.teacher_id
      LEFT JOIN Subject s2 ON te.subject_id = s2.subject_id
      WHERE t.college_id = ?
      GROUP BY t.teacher_id
      `,
      [collegeId]
    );


    const [allSubjects] = await db.query("SELECT * FROM Subject ORDER BY subject_semester, subject_name");

    const [pincodes] = await db.query("SELECT pincode FROM bangalore_pincodes ORDER BY pincode ASC");

    res.render("college/manage_teachers", {
      teachers,
      allSubjects,
      pincodes,
      college: req.session.college,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching teachers.");
  }
});

// Approve teacher
router.post("/teacher/approve/:id", ensureCollegeLoggedIn, async (req, res) => {
  const teacherId = req.params.id;

  try {
    await db.query("UPDATE Teacher SET approved = 'Yes' WHERE teacher_id = ?", [
      teacherId,
    ]);
    res.redirect("college/teacher/manage");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error approving teacher.");
  }
});

// Update teacher details
router.post("/teachers/update/:id", ensureCollegeLoggedIn, async (req, res) => {
  console.log("Updating teacher...");
  const teacherId = req.params.id;

  const {
    teacher_name,
    teacher_gender,
    teacher_phone,
    teacher_address,
    teacher_pincode,
    theory_subjects = [],
    practical_subjects = [],
  } = req.body;

  try {
    // Ensure required fields
    if (
      !teacher_name ||
      !teacher_gender ||
      !teacher_phone ||
      !teacher_address ||
      !teacher_pincode
    ) {
      return res.status(400).send("❌ All fields are required");
    }

    // Update basic teacher info
    await db.query(
      `UPDATE Teacher 
       SET teacher_name = ?, teacher_gender = ?, teacher_phone = ?, 
           teacher_address = ?, teacher_pincode = ?
       WHERE teacher_id = ?`,
      [
        teacher_name,
        teacher_gender,
        teacher_phone,
        teacher_address,
        teacher_pincode,
        teacherId,
      ]
    );

    // Clear old subject specializations
    await db.query("DELETE FROM Theory_Exam_Specialization WHERE teacher_id = ?", [teacherId]);
    await db.query("DELETE FROM Practical_Exam_Specialization WHERE teacher_id = ?", [teacherId]);

    // Re-insert theory subjects
    if (Array.isArray(theory_subjects)) {
      const theoryData = Array.isArray(theory_subjects)
        ? theory_subjects
        : [theory_subjects]; // Handle single select

      for (const subjectId of theoryData) {
        await db.query(
          "INSERT INTO Theory_Exam_Specialization (teacher_id, subject_id) VALUES (?, ?)",
          [teacherId, subjectId]
        );
      }
    }

    // Re-insert practical subjects
    if (Array.isArray(practical_subjects)) {
      const practicalData = Array.isArray(practical_subjects)
        ? practical_subjects
        : [practical_subjects]; // Handle single select

      for (const subjectId of practicalData) {
        await db.query(
          "INSERT INTO Practical_Exam_Specialization (teacher_id, subject_id) VALUES (?, ?)",
          [teacherId, subjectId]
        );
      }
    }

    // Success redirect
    res.redirect("/college/teacher/manage");
  } catch (error) {
    console.error("Error updating teacher details:", error);
    res.status(500).send("❌ Failed to update teacher info and specialization.");
  }
});


// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/college/login");
  });
});

module.exports = router;
