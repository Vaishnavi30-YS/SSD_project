
require('dotenv').config()

const bcrypt = require('bcryptjs')
const db = require('./database')

try {
    const rollNo = process.env.ADMIN_ROLL_NO
    const password = process.env.ADMIN_PASSWORD

    const admin = db.prepare(`
        SELECT password_hash
        FROM users
        WHERE university_roll_no = ? AND role = 'ADMIN'
    `).get(rollNo)

    if (!admin) {
        console.log('Admin account not found.')
    } else {
        const matches = bcrypt.compareSync(
            password,
            admin.password_hash
        )

        console.log('Admin account found:', true)
        console.log('Password matches .env:', matches)
    }
} catch (error) {
    console.error(error.message)
} finally {
    db.close()
}
