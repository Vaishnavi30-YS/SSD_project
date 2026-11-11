
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('./database')

const router = express.Router()

// ======================================================
// AUTHENTICATION AND ADMINISTRATOR VERIFICATION
// ======================================================

const verifyAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token required.'
            })
        }

        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if (decoded.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Administrator access required.'
            })
        }

        req.user = decoded
        next()

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        })
    }
}

// ======================================================
// GET ALL STUDENTS AND EXAMINERS
// GET /api/v1/users
// ======================================================

router.get('/', verifyAdmin, (req, res) => {
    try {
        const users = db.prepare(`
            SELECT
                user_id,
                university_roll_no,
                name,
                email,
                role,
                created_at
            FROM users
            WHERE role IN ('STUDENT', 'EXAMINER')
            ORDER BY created_at DESC
        `).all()

        res.json({
            success: true,
            count: users.length,
            users
        })

    } catch (error) {
        console.error('User retrieval error:', error.message)

        res.status(500).json({
            success: false,
            message: 'Could not retrieve user accounts.'
        })
    }
})

// ======================================================
// CREATE STUDENT OR EXAMINER ACCOUNT
// POST /api/v1/users/create
// ======================================================

router.post('/create', verifyAdmin, (req, res) => {
    try {
        const {
            university_roll_no,
            name,
            email,
            password,
            role
        } = req.body

        if (
            !university_roll_no ||
            !name ||
            !email ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required.'
            })
        }

        if (!['STUDENT', 'EXAMINER'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Only STUDENT and EXAMINER accounts can be created here.'
            })
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least 8 characters.'
            })
        }

        const passwordHash = bcrypt.hashSync(password, 12)

        const result = db.prepare(`
            INSERT INTO users (
                university_roll_no,
                name,
                email,
                password_hash,
                role
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            university_roll_no.trim(),
            name.trim(),
            email.trim(),
            passwordHash,
            role
        )

        db.prepare(`
            INSERT INTO audit_logs (
                user_id,
                action,
                details
            )
            VALUES (?, ?, ?)
        `).run(
            req.user.user_id,
            'ACCOUNT_CREATED',
            `${role} account created`
        )

        res.status(201).json({
            success: true,
            message: `${role} account created successfully.`,
            user_id: result.lastInsertRowid
        })

    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({
                success: false,
                message: 'Registration number or email already exists.'
            })
        }

        console.error('Account creation error:', error.message)

        res.status(500).json({
            success: false,
            message: 'Could not create account.'
        })
    }
})

// ======================================================
// GET SYSTEM AUDIT LOGS
// GET /api/v1/users/audit-logs
// ======================================================

router.get('/audit-logs', verifyAdmin, (req, res) => {
    try {
        const logs = db.prepare(`
            SELECT
                audit_logs.log_id,
                audit_logs.action,
                audit_logs.details,
                audit_logs.created_at,
                users.name AS user_name,
                users.university_roll_no,
                users.role AS user_role
            FROM audit_logs
            LEFT JOIN users
                ON audit_logs.user_id = users.user_id
            ORDER BY audit_logs.created_at DESC
            LIMIT 100
        `).all()

        res.json({
            success: true,
            count: logs.length,
            logs
        })

    } catch (error) {
        console.error('Audit logs error:', error.message)

        res.status(500).json({
            success: false,
            message: 'Could not retrieve audit logs.'
        })
    }
})

module.exports = router
