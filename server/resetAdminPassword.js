
require('dotenv').config()

const bcrypt = require('bcryptjs')
const db = require('./database')

try {
    const rollNo = process.env.ADMIN_ROLL_NO
    const password = process.env.ADMIN_PASSWORD

    if (!rollNo || !password || password.length < 8) {
        throw new Error('Check ADMIN_ROLL_NO and ADMIN_PASSWORD in .env')
    }

    const admin = db.prepare(`
        SELECT user_id FROM users
        WHERE university_roll_no = ? AND role = 'ADMIN'
    `).get(rollNo)

    if (!admin) {
        throw new Error('Admin account not found.')
    }

    const passwordHash = bcrypt.hashSync(password, 12)

    db.prepare(`
        UPDATE users
        SET password_hash = ?
        WHERE university_roll_no = ? AND role = 'ADMIN'
    `).run(passwordHash, rollNo)

    console.log('Administrator password reset successfully!')
} catch (error) {
    console.error(error.message)
    process.exitCode = 1
} finally {
    db.close()
}
