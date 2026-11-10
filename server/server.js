
const express = require('express')
const cors = require('cors')
require('dotenv').config()

// Database connection
const db = require('./database')

// Route imports
const authRoutes = require('./authRoutes')
const userRoutes = require('./userRoutes')
const courseRoutes = require('./courseRoutes')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Home route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to ExamEase!',
        status: 'Backend running successfully'
    })
})

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        application: 'ExamEase',
        backend: 'Online',
        database: db.open ? 'Connected' : 'Disconnected',
        status: 'OK'
    })
})

// Database table check
app.get('/api/database', (req, res) => {
    try {
        const tables = db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
        `).all()

        res.json({
            message: 'Database connected successfully',
            tables: tables.map(table => table.name)
        })
    } catch (error) {
        res.status(500).json({
            message: 'Database error',
            error: error.message
        })
    }
})

// Authentication routes
app.use('/api/v1/auth', authRoutes)

// User management routes
app.use('/api/v1/users', userRoutes)

// Course enrolment routes
app.use('/api/v1/courses', courseRoutes)

// Start server
app.listen(PORT, () => {
    console.log('--------------------------------')
    console.log('       EXAMEASE SERVER')
    console.log('--------------------------------')
    console.log(`Server: http://localhost:${PORT}`)
    console.log('Database: Connected')
    console.log('Authentication: Enabled')
    console.log('User Management: Enabled')
    console.log('Course Enrolment: Enabled')
    console.log('Status: Running')
    console.log('--------------------------------')
})
