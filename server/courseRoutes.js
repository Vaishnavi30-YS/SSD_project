
const express = require('express')
const jwt = require('jsonwebtoken')
const db = require('./database')

const router = express.Router()

// Verify administrator access
const verifyAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token required'
            })
        }

        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if (decoded.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Administrator access required'
            })
        }

        req.user = decoded
        next()
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        })
    }
}

// Enrol a student in a course
router.post('/enrol', verifyAdmin, (req, res) => {
    try {
        const { university_roll_no, course_name, subject_code } = req.body

        if (!university_roll_no || !course_name) {
            return res.status(400).json({
                success: false,
                message: 'Student registration number and course name are required'
            })
        }

        const student = db.prepare(`
            SELECT user_id, name, university_roll_no, role
            FROM users
            WHERE university_roll_no = ?
        `).get(university_roll_no)

        if (!student || student.role !== 'STUDENT') {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            })
        }

        const result = db.prepare(`
            INSERT INTO course_enrolments
            (student_id, course_name, subject_code)
            VALUES (?, ?, ?)
        `).run(
            student.user_id,
            course_name.trim(),
            subject_code ? subject_code.trim() : null
        )

        res.status(201).json({
            success: true,
            message: 'Student enrolled successfully',
            enrolment_id: result.lastInsertRowid
        })

    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({
                success: false,
                message: 'Student is already enrolled in this course'
            })
        }

        console.error('Enrolment error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to enrol student'
        })
    }
})

// Get all course enrolments
router.get('/enrolments', verifyAdmin, (req, res) => {
    try {
        const enrolments = db.prepare(`
            SELECT
                ce.enrolment_id,
                ce.student_id,
                u.name AS student_name,
                u.university_roll_no,
                ce.course_name,
                ce.subject_code,
                ce.enrolled_at,
                ce.status
            FROM course_enrolments ce
            JOIN users u ON ce.student_id = u.user_id
            ORDER BY ce.enrolment_id DESC
        `).all()

        res.json({
            success: true,
            count: enrolments.length,
            enrolments
        })

    } catch (error) {
        console.error('Fetch enrolments error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to fetch course enrolments'
        })
    }
})

module.exports = router
