const express = require("express");
const router = express.Router();
const db = require("../config/db").promise(); // Ensure DB connection is correct

// Fetch all subjects grouped by semester
router.get("/", async (req, res) => {

    try {
        const [subjects] = await db.query("SELECT * FROM Subject ORDER BY subject_semester, subject_name");
        // Group subjects by semester
        const subjectsBySemester = [];
        const semesterMap = new Map();

        subjects.forEach(subject => {
            if (!semesterMap.has(subject.subject_semester)) {
                semesterMap.set(subject.subject_semester, {
                    semester: subject.subject_semester,
                    theorySubjects: [],
                    practicalSubjects: []
                });
            }

            if (subject.is_practical) {
                semesterMap.get(subject.subject_semester).practicalSubjects.push(subject);
            } else {
                semesterMap.get(subject.subject_semester).theorySubjects.push(subject);
            }
        });

        subjectsBySemester.push(...semesterMap.values());

        // Render the page with the corrected data
        res.render("subjects", { subjectsBySemester });

    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Error fetching subjects <strong>please Reload</strong>");
    }
});

module.exports = router;
