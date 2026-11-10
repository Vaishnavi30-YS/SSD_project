const db = require('./database')

const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name
`).all()

console.log('DATABASE TABLES:')
console.table(tables)

db.close()