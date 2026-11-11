
const bcrypt = require('bcryptjs')
const db = require('./database')
const readline = require('readline')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

rl.question('Enter a new Examiner password (minimum 8 characters): ', (password) => {
    if (password.length < 8) {
        console.log('Password must contain at least 8 characters.')
        db.close()
        rl.close()
        return
    }

    const passwordHash = bcrypt.hashSync(password, 12)

    const result = db.prepare(`
        UPDATE users
        SET password_hash = ?
        WHERE university_roll_no = ?
        AND role = ?
    `).run(passwordHash, 'EXAM001', 'EXAMINER')

    if (result.changes === 1) {
        console.log('Examiner password updated successfully!')
    } else {
        console.log('Examiner account not found.')
    }

    db.close()
    rl.close()
})
