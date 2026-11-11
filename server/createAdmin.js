
require('dotenv').config()

const bcrypt = require('bcryptjs')
const db = require('./database')

const rollNo = process.env.ADMIN_ROLL_NO
const name = process.env.ADMIN_NAME
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

if (!rollNo || !name || !email || !password) {
    console.error('Admin details are missing in the .env file.')
    db.close()
    process.exitCode = 1
} else if (password.length < 8) {
    console.error('Admin password must be at least 8 characters.')
    db.close()
    process.exitCode = 1
} else {
    try {
        const existing = db.prepare(
            "SELECT user_id FROM users WHERE role = 'ADMIN'"
        ).get()

        if (existing) {
            console.log('An administrator account already exists.')
        } else {
            const passwordHash = bcrypt.hashSync(password, 12)

            db.prepare(`
                INSERT INTO users
                (university_roll_no, name, email, password_hash, role)
                VALUES (?, ?, ?, ?, 'ADMIN')
            `).run(rollNo, name, email, passwordHash)

            console.log('Initial administrator created successfully.')
        }
    } catch (error) {
        console.error('Admin creation failed:', error.message)
        process.exitCode = 1
    } finally {
        db.close()
    }
}
