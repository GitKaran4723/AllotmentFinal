const express = require("express");
const router = express.Router();
const db = require("../config/db").promise();

// Route to get registration form with colleges, pincodes, and subjects
// Route to get registration form with colleges, pincodes, and subjects
router.get("/register-teacher", async (req, res) => {
    try {
        // Fetch Colleges with their names from `dummy_college`
        const [colleges] = await db.query(`
            SELECT c.college_id, d.college_name
            FROM College c
            JOIN dummy_college d ON c.college_code = d.college_code
        `);

        // Fetch Pincodes (Ensure `bangalore_pincodes` table has `pincode` column)
        const [pincodes] = await db.query("SELECT pincode FROM bangalore_pincodes");

        // Fetch Practical Subjects (is_practical = 1)
        const [practicalSubjects] = await db.query(`
            SELECT subject_id, subject_name, subject_semester 
            FROM Subject 
            WHERE is_practical = 1
            ORDER BY subject_semester
        `);

        // Fetch Theory Subjects (is_practical = 0)
        const [theorySubjects] = await db.query(`
            SELECT subject_id, subject_name, subject_semester 
            FROM Subject 
            WHERE is_practical = 0
            ORDER BY subject_semester
        `);

        // Convert `success` to a boolean (Fixes the issue)
        const success = req.query.success === "true";
        const error = req.query.error || null; // Ensure error is always defined

        // Render EJS file with variables
        res.render("teacher/register-teacher", {
            success, // Passing success as a variable
            error,
            colleges,
            pincodes,
            practicalSubjects,
            theorySubjects
        });

    } catch (error) {
        console.error("Error fetching form data:", error);
        res.status(500).send("Server error");
    }
});



// Route to handle form submission
// Route to handle teacher registration
router.post("/register-teacher", async (req, res) => {
    const {
        teacher_name,
        teacher_gender,
        teacher_phone,
        college_id,
        teacher_address,
        teacher_pincode,
        years_experience,
        practical_subjects,
        theory_subjects
    } = req.body;

    // Check for missing required fields (Basic validation)
    if (!teacher_name || !teacher_gender || !teacher_phone || !college_id || !teacher_pincode || !years_experience) {
        return res.redirect("/register-teacher?error=validation");
    }

    try {
        // Insert teacher details (default 'No' for approved)
        const [result] = await db.query(
            "INSERT INTO Teacher (teacher_name, teacher_gender, teacher_phone, college_id, teacher_address, teacher_pincode, years_experience, approved) VALUES (?, ?, ?, ?, ?, ?, ?, 'No')",
            [teacher_name, teacher_gender, teacher_phone, college_id, teacher_address, teacher_pincode, years_experience]
        );

        const teacher_id = result.insertId;

        // Insert into Practical_Exam_Specialization
        if (practical_subjects && practical_subjects.length > 0) {
            const practicalValues = practical_subjects.map(subject_id => [teacher_id, subject_id]);
            await db.query("INSERT INTO Practical_Exam_Specialization (teacher_id, subject_id) VALUES ?", [practicalValues]);
        }

        // Insert into Theory_Exam_Specialization
        if (theory_subjects && theory_subjects.length > 0) {
            const theoryValues = theory_subjects.map(subject_id => [teacher_id, subject_id]);
            await db.query("INSERT INTO Theory_Exam_Specialization (teacher_id, subject_id) VALUES ?", [theoryValues]);
        }

        // Redirect with success message
        res.redirect("/register-teacher?success=true");

    } catch (error) {
        console.error("Error registering teacher:", error);

        // Check for duplicate phone number error
        if (error.code === "ER_DUP_ENTRY") {
            return res.redirect("/register-teacher?error=duplicate");
        }

        // If any other unknown error occurs, show generic error
        return res.redirect("/register-teacher?error=unknown");
    }
});




module.exports = router;
