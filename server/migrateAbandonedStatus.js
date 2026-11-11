
const db = require('./database');

try {
    db.pragma('foreign_keys = OFF');

    db.transaction(() => {
        db.exec(`
            CREATE TABLE exam_attempts_new (
                attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                exam_id INTEGER NOT NULL,
                started_at DATETIME,
                expires_at DATETIME,
                submitted_at DATETIME,
                status TEXT DEFAULT 'IN_PROGRESS'
                    CHECK (
                        status IN (
                            'IN_PROGRESS',
                            'SUBMITTED',
                            'AUTO_SUBMITTED',
                            'PENDING_MANUAL_REVIEW',
                            'GRADED',
                            'PUBLISHED',
                            'ABANDONED'
                        )
                    ),
                total_marks REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(user_id),
                FOREIGN KEY (exam_id) REFERENCES examinations(exam_id)
            );

            INSERT INTO exam_attempts_new (
                attempt_id, student_id, exam_id,
                started_at, expires_at, submitted_at,
                status, total_marks, created_at
            )
            SELECT
                attempt_id, student_id, exam_id,
                started_at, expires_at, submitted_at,
                status, total_marks, created_at
            FROM exam_attempts;

            DROP TABLE exam_attempts;

            ALTER TABLE exam_attempts_new RENAME TO exam_attempts;
        `);
    })();

    db.pragma('foreign_keys = ON');

    const result = db.prepare(
        "SELECT sql FROM sqlite_master WHERE name = 'exam_attempts'"
    ).get();

    console.log('Migration successful!');
    console.log('ABANDONED status is now supported.');
    console.log(result.sql);

    const violations = db.pragma('foreign_key_check');
    console.log('Foreign key check:', violations);

} catch (error) {
    console.error('Migration failed:', error.message);
    db.pragma('foreign_keys = ON');
    process.exitCode = 1;
}
