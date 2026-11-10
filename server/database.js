
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(__dirname, 'examease.db'))

// Enable foreign key relationships
db.pragma('foreign_keys = ON')

// 1. USERS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    university_roll_no TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (
        role IN ('STUDENT', 'EXAMINER', 'ADMIN')
    ),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`)

// 2. EXAMINATIONS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS examinations (
    exam_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    examiner_id INTEGER,
    batch TEXT,
    duration_minutes INTEGER NOT NULL,
    scheduled_start DATETIME,
    scheduled_end DATETIME,
    delivery_mode TEXT DEFAULT 'FREE_NAVIGATION'
        CHECK (
            delivery_mode IN (
                'FREE_NAVIGATION',
                'SEQUENTIAL_ONE_BY_ONE'
            )
        ),
    status TEXT DEFAULT 'DRAFT'
        CHECK (
            status IN (
                'DRAFT',
                'SCHEDULED',
                'ONGOING',
                'COMPLETED',
                'PUBLISHED'
            )
        ),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (examiner_id) REFERENCES users(user_id)
);
`)

// 3. QUESTIONS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS questions (
    question_id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (
        question_type IN ('MCQ', 'DESCRIPTIVE')
    ),
    options TEXT,
    correct_option_id TEXT,
    grading_rubric TEXT,
    marks REAL NOT NULL DEFAULT 1,
    negative_marks REAL DEFAULT 0,
    question_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id)
        REFERENCES examinations(exam_id)
        ON DELETE CASCADE
);
`)

// 4. EXAM ATTEMPTS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS exam_attempts (
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
                'PUBLISHED'
            )
        ),
    total_marks REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (exam_id) REFERENCES examinations(exam_id)
);
`)

// 5. STUDENT ANSWERS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS student_answers (
    answer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer_text TEXT,
    sequence_version INTEGER DEFAULT 0,
    is_synced INTEGER DEFAULT 0,
    marks_awarded REAL,
    feedback TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id)
        REFERENCES exam_attempts(attempt_id),
    FOREIGN KEY (question_id)
        REFERENCES questions(question_id),
    UNIQUE (attempt_id, question_id)
);
`)

// 6. AUDIT LOGS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
`)

// 7. COURSE ENROLMENTS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS course_enrolments (
    enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_name TEXT NOT NULL,
    subject_code TEXT,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'ENROLLED'
        CHECK (
            status IN ('ENROLLED', 'DROPPED')
        ),
    FOREIGN KEY (student_id)
        REFERENCES users(user_id),
    UNIQUE (student_id, course_name)
);
`)

console.log('ExamEase database created successfully!')
console.log('All seven database tables are ready.')

module.exports = db

