
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('./database')

const router = express.Router()

// POST: User Login
router.post('/login', (req, res) => {
    try {
        const { university_roll_no, password } = req.body

        // Validate input
        if (!university_roll_no || !password) {
            return res.status(400).json({
                success: false,
                message: 'Registration number and password are required.'
            })
        }

        // Find user
        const user = db.prepare(`
            SELECT user_id, university_roll_no, name,
                   email, password_hash, role
            FROM users
            WHERE university_roll_no = ?
        `).get(university_roll_no.trim())

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid registration number or password.'
            })
        }

        // Verify password
        const passwordMatch = bcrypt.compareSync(
            password,
            user.password_hash
        )

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid registration number or password.'
            })
        }

        // Create JWT token
        const token = jwt.sign(
            {
                user_id: user.user_id,
                university_roll_no: user.university_roll_no,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        )

        // Record successful login
        db.prepare(`
            INSERT INTO audit_logs (user_id, action, details)
            VALUES (?, ?, ?)
        `).run(
            user.user_id,
            'LOGIN',
            'User logged in successfully'
        )

        // Send response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                university_roll_no: user.university_roll_no,
                name: user.name,
                email: user.email,
                role: user.role
            }
        })

    } catch (error) {
        console.error('Login error:', error.message)

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})

module.exports = router
