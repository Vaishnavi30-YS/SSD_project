
const db = require('./database')

const examiners = db.prepare(`
    SELECT
        user_id,
        name,
        university_roll_no,
        email,
        role
    FROM users
    WHERE role = ?
`).all('EXAMINER')

console.log('\nEXAMINER ACCOUNTS:')
console.table(examiners)

db.close()
