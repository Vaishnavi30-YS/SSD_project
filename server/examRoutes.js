
const express = require('express')
const jwt = require('jsonwebtoken')
const db = require('./database')

const router = express.Router()

// ======================================================
// AUTHENTICATION AND ROLE VERIFICATION
// ======================================================

const authenticate = (req, res, next) => {
    try {
        const header = req.headers.authorization

        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            })
        }

        req.user = jwt.verify(
            header.split(' ')[1],
            process.env.JWT_SECRET
        )

        next()
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        })
    }
}

const allowRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        })
    }

    next()
}

const userId = req => req.user.user_id

const getExam = examId => db.prepare(
    'SELECT * FROM examinations WHERE exam_id = ?'
).get(examId)

const examinerOwnsExam = (exam, req) =>
    req.user.role === 'ADMIN' ||
    Number(exam.examiner_id) === Number(userId(req))

router.use(authenticate)

router.use((req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
        req.body = {}
    }
    next()
})

// ======================================================
// HELPER: GRADE AN ATTEMPT
// ======================================================

const gradeAttempt = (attemptId, automatic = false) => {
    const attempt = db.prepare(`
        SELECT * FROM exam_attempts
        WHERE attempt_id = ?
    `).get(attemptId)

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
        return null
    }

    const questions = db.prepare(`
        SELECT * FROM questions
        WHERE exam_id = ?
        ORDER BY question_order ASC, question_id ASC
    `).all(attempt.exam_id)

    const insertMissingAnswer = db.prepare(`
        INSERT OR IGNORE INTO student_answers (
            attempt_id,
            question_id,
            answer_text,
            sequence_version,
            is_synced,
            updated_at
        )
        VALUES (?, ?, '', 0, 1, ?)
    `)

    for (const question of questions) {
        if (question.question_type === 'DESCRIPTIVE') {
            insertMissingAnswer.run(
                attemptId,
                question.question_id,
                new Date().toISOString()
            )
        }
    }

    const answers = db.prepare(`
        SELECT * FROM student_answers
        WHERE attempt_id = ?
    `).all(attemptId)

    const answerMap = new Map(
        answers.map(answer => [
            Number(answer.question_id),
            answer
        ])
    )

    let mcqMarks = 0
    let hasDescriptive = false

    const updateAnswer = db.prepare(`
        UPDATE student_answers
        SET marks_awarded = ?
        WHERE answer_id = ?
    `)

    for (const question of questions) {
        const answer = answerMap.get(Number(question.question_id))

        if (question.question_type === 'MCQ') {
            if (answer) {
                const isCorrect =
                    String(answer.answer_text || '').trim() ===
                    String(question.correct_option_id || '').trim()

                const marks = isCorrect
                    ? Number(question.marks || 0)
                    : Number(question.negative_marks || 0) * -1

                mcqMarks += marks
                updateAnswer.run(marks, answer.answer_id)
            }
        } else if (question.question_type === 'DESCRIPTIVE') {
            hasDescriptive = true
        }
    }

    const finalStatus = hasDescriptive
        ? 'PENDING_MANUAL_REVIEW'
        : (automatic ? 'AUTO_SUBMITTED' : 'GRADED')

    db.prepare(`
        UPDATE exam_attempts
        SET submitted_at = ?,
            total_marks = ?,
            status = ?
        WHERE attempt_id = ?
        AND status = 'IN_PROGRESS'
    `).run(
        new Date().toISOString(),
        mcqMarks,
        finalStatus,
        attemptId
    )

    return {
        attempt_id: attemptId,
        mcq_marks: mcqMarks,
        status: finalStatus
    }
}

// ======================================================
// AUTOMATIC SUBMISSION OF EXPIRED EXAMS
// ======================================================

const autoSubmitExpiredAttempts = () => {
    try {
        const now = new Date().toISOString()

        const expiredAttempts = db.prepare(`
            SELECT attempt_id
            FROM exam_attempts
            WHERE status = 'IN_PROGRESS'
            AND expires_at <= ?
        `).all(now)

        for (const attempt of expiredAttempts) {
            gradeAttempt(attempt.attempt_id, true)
        }
    } catch (error) {
        console.error('Automatic submission error:', error)
    }
}

const autoSubmitTimer = setInterval(
    autoSubmitExpiredAttempts,
    60000
)

if (typeof autoSubmitTimer.unref === 'function') {
    autoSubmitTimer.unref()
}

// ======================================================
// 1. CREATE EXAMINATION
// ======================================================

router.post(
    '/',
    allowRoles('EXAMINER', 'ADMIN'),
    (req, res) => {
        try {
            const {
                title,
                subject,
                description,
                batch,
                duration,
                date,
                deliveryMode
            } = req.body

            if (!title || !subject || !duration) {
                return res.status(400).json({
                    success: false,
                    message: 'Title, subject and duration are required'
                })
            }

            const scheduledStart = date
                ? new Date(date).toISOString()
                : null

            const result = db.prepare(`
                INSERT INTO examinations (
                    title,
                    subject,
                    description,
                    examiner_id,
                    batch,
                    duration_minutes,
                    scheduled_start,
                    delivery_mode,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                title,
                subject,
                description || '',
                userId(req),
                batch || '',
                Number(duration),
                scheduledStart,
                deliveryMode || 'ALL_AT_ONCE',
                'SCHEDULED'
            )

            return res.status(201).json({
                success: true,
                message: 'Examination created successfully',
                exam_id: result.lastInsertRowid
            })
        } catch (error) {
            console.error('Create examination error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to create examination'
            })
        }
    }
)

// ======================================================
// 2. GET EXAMINATIONS CREATED BY EXAMINER
// ======================================================

router.get(
    '/mine',
    allowRoles('EXAMINER', 'ADMIN'),
    (req, res) => {
        try {
            let examinations

            if (req.user.role === 'ADMIN') {
                examinations = db.prepare(`
                    SELECT * FROM examinations
                    ORDER BY created_at DESC
                `).all()
            } else {
                examinations = db.prepare(`
                    SELECT * FROM examinations
                    WHERE examiner_id = ?
                    ORDER BY created_at DESC
                `).all(userId(req))
            }

            return res.json({
                success: true,
                examinations
            })
        } catch (error) {
            console.error('Fetch examinations error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch examinations'
            })
        }
    }
)

// ======================================================
// 3. ADD MULTIPLE QUESTIONS
// ======================================================

router.post(
    '/:examId/questions/bulk',
    allowRoles('EXAMINER', 'ADMIN'),
    (req, res) => {
        try {
            const examId = Number(req.params.examId)
            const exam = getExam(examId)
            const questions = req.body.questions

            if (!exam) {
                return res.status(404).json({
                    success: false,
                    message: 'Examination not found'
                })
            }

            if (!examinerOwnsExam(exam, req)) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot modify this examination'
                })
            }

            if (!Array.isArray(questions) || questions.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide at least one question'
                })
            }

            const insertQuestion = db.prepare(`
                INSERT INTO questions (
                    exam_id,
                    question_text,
                    question_type,
                    options,
                    correct_option_id,
                    grading_rubric,
                    marks,
                    negative_marks,
                    question_order
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)

            const transaction = db.transaction(items => {
                for (let i = 0; i < items.length; i++) {
                    const q = items[i]

                    if (!q.question_text || !q.question_type) {
                        throw new Error(
                            `Question ${i + 1} is missing required details`
                        )
                    }

                    const type = String(q.question_type).toUpperCase()

                    if (!['MCQ', 'DESCRIPTIVE'].includes(type)) {
                        throw new Error(
                            `Invalid question type in question ${i + 1}`
                        )
                    }

                    insertQuestion.run(
                        examId,
                        q.question_text,
                        type,
                        type === 'MCQ'
                            ? JSON.stringify(q.options || [])
                            : null,
                        type === 'MCQ'
                            ? (q.correct_option_id || null)
                            : null,
                        type === 'DESCRIPTIVE'
                            ? (q.grading_rubric || '')
                            : null,
                        Number(q.marks || 1),
                        Number(q.negative_marks || 0),
                        Number(q.question_order || i + 1)
                    )
                }
            })

            transaction(questions)

            return res.status(201).json({
                success: true,
                message: 'All questions saved successfully',
                total_questions: questions.length
            })
        } catch (error) {
            console.error('Bulk question error:', error)

            return res.status(500).json({
                success: false,
                message: error.message || 'Unable to save questions'
            })
        }
    }
)

// ======================================================
// 4. GET AVAILABLE EXAMINATIONS
// ======================================================

router.get(
    '/available',
    allowRoles('STUDENT'),
    (req, res) => {
        try {
            const examinations = db.prepare(`
                SELECT
                    e.exam_id,
                    e.title,
                    e.subject,
                    e.description,
                    e.batch,
                    e.duration_minutes,
                    e.scheduled_start,
                    e.scheduled_end,
                    e.delivery_mode,
                    e.status
                FROM examinations e
                WHERE e.status IN (
                    'SCHEDULED',
                    'ONGOING',
                    'PUBLISHED',
                    'COMPLETED'
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM exam_attempts ea
                    WHERE ea.exam_id = e.exam_id
                    AND ea.student_id = ?
                    AND ea.status IN (
                        'SUBMITTED',
                        'AUTO_SUBMITTED',
                        'PENDING_MANUAL_REVIEW',
                        'GRADED',
                        'PUBLISHED'
                    )
                )
                ORDER BY e.scheduled_start ASC
            `).all(userId(req))

            return res.json({
                success: true,
                examinations
            })
        } catch (error) {
            console.error('Available examinations error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch available examinations'
            })
        }
    }
)

// ======================================================
// 5. GET QUESTIONS
// ======================================================

router.get(
    '/:examId/questions',
    allowRoles('STUDENT', 'EXAMINER', 'ADMIN'),
    (req, res) => {
        try {
            const examId = Number(req.params.examId)
            const exam = getExam(examId)

            if (!exam) {
                return res.status(404).json({
                    success: false,
                    message: 'Examination not found'
                })
            }

            if (
                req.user.role !== 'STUDENT' &&
                !examinerOwnsExam(exam, req)
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot access this examination'
                })
            }

            const questions = db.prepare(`
                SELECT
                    question_id,
                    exam_id,
                    question_text,
                    question_type,
                    options,
                    marks,
                    negative_marks,
                    question_order
                FROM questions
                WHERE exam_id = ?
                ORDER BY question_order ASC, question_id ASC
            `).all(examId)

            const safeQuestions = questions.map(question => ({
                ...question,
                options: question.options
                    ? JSON.parse(question.options)
                    : []
            }))

            return res.json({
                success: true,
                examination: {
                    exam_id: exam.exam_id,
                    title: exam.title,
                    subject: exam.subject,
                    duration_minutes: exam.duration_minutes,
                    delivery_mode: exam.delivery_mode
                },
                questions: safeQuestions
            })
        } catch (error) {
            console.error('Fetch questions error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch questions'
            })
        }
    }
)

// ======================================================
// 6. START OR RESUME AN EXAMINATION
// ======================================================

router.post(
    '/:examId/attempts/start',
    allowRoles('STUDENT'),
    (req, res) => {
        try {
            const examId = Number(req.params.examId)
            const exam = getExam(examId)

            if (!exam) {
                return res.status(404).json({
                    success: false,
                    message: 'Examination not found'
                })
            }

            const existingAttempt = db.prepare(`
                SELECT *
                FROM exam_attempts
                WHERE exam_id = ?
                AND student_id = ?
                AND status = 'IN_PROGRESS'
                ORDER BY attempt_id DESC
                LIMIT 1
            `).get(examId, userId(req))

            if (existingAttempt) {
                const now = new Date()

                if (now.getTime() >= Date.parse(existingAttempt.expires_at)) {
                    gradeAttempt(existingAttempt.attempt_id, true)

                    return res.status(409).json({
                        success: false,
                        message: 'The examination time has expired. Your attempt was automatically submitted.'
                    })
                }

                return res.json({
                    success: true,
                    message: 'Resuming existing examination',
                    attempt: existingAttempt,
                    server_current_time: now.toISOString()
                })
            }

            const previousAttempt = db.prepare(`
                SELECT attempt_id
                FROM exam_attempts
                WHERE exam_id = ?
                AND student_id = ?
                AND status IN (
                    'SUBMITTED',
                    'AUTO_SUBMITTED',
                    'PENDING_MANUAL_REVIEW',
                    'GRADED',
                    'PUBLISHED'
                )
                LIMIT 1
            `).get(examId, userId(req))

            if (previousAttempt) {
                return res.status(409).json({
                    success: false,
                    message: 'You have already attempted this examination'
                })
            }

            const now = new Date()
            const expiresAt = new Date(
                now.getTime() +
                Number(exam.duration_minutes) * 60 * 1000
            )

            const result = db.prepare(`
                INSERT INTO exam_attempts (
                    student_id,
                    exam_id,
                    started_at,
                    expires_at,
                    status
                )
                VALUES (?, ?, ?, ?, 'IN_PROGRESS')
            `).run(
                userId(req),
                examId,
                now.toISOString(),
                expiresAt.toISOString()
            )

            const attempt = db.prepare(`
                SELECT * FROM exam_attempts
                WHERE attempt_id = ?
            `).get(result.lastInsertRowid)

            return res.status(201).json({
                success: true,
                message: 'Examination started successfully',
                attempt,
                server_current_time: now.toISOString()
            })
        } catch (error) {
            console.error('Start examination error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to start examination'
            })
        }
    }
)

// ======================================================
// 7. SYNCHRONIZE STUDENT ANSWERS
// ======================================================

router.patch(
    '/attempts/:attemptId/sync',
    allowRoles('STUDENT'),
    (req, res) => {
        try {
            const attemptId = Number(req.params.attemptId)

            const attempt = db.prepare(`
                SELECT * FROM exam_attempts
                WHERE attempt_id = ?
            `).get(attemptId)

            if (!attempt) {
                return res.status(404).json({
                    success: false,
                    message: 'Attempt not found'
                })
            }

            if (Number(attempt.student_id) !== Number(userId(req))) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot modify this attempt'
                })
            }

            if (attempt.status !== 'IN_PROGRESS') {
                return res.status(400).json({
                    success: false,
                    message: 'This examination has already been submitted'
                })
            }

            const now = Date.now()
            const expiry = Date.parse(attempt.expires_at)

            if (now > expiry + 180000) {
                gradeAttempt(attemptId, true)

                return res.status(400).json({
                    success: false,
                    message: 'Examination time has expired'
                })
            }

            const answers = req.body.answers

            if (!Array.isArray(answers)) {
                return res.status(400).json({
                    success: false,
                    message: 'Answers must be provided as an array'
                })
            }

            const validQuestions = db.prepare(`
                SELECT question_id FROM questions
                WHERE exam_id = ?
            `).all(attempt.exam_id)

            const validIds = new Set(
                validQuestions.map(q => Number(q.question_id))
            )

            const saveAnswer = db.prepare(`
                INSERT INTO student_answers (
                    attempt_id,
                    question_id,
                    answer_text,
                    sequence_version,
                    is_synced,
                    updated_at
                )
                VALUES (?, ?, ?, ?, 1, ?)
                ON CONFLICT(attempt_id, question_id)
                DO UPDATE SET
                    answer_text = excluded.answer_text,
                    sequence_version = excluded.sequence_version,
                    is_synced = 1,
                    updated_at = excluded.updated_at
                WHERE excluded.sequence_version >=
                    student_answers.sequence_version
            `)

            const transaction = db.transaction(items => {
                for (const answer of items) {
                    const questionId = Number(answer.question_id)

                    if (!validIds.has(questionId)) continue

                    saveAnswer.run(
                        attemptId,
                        questionId,
                        answer.answer_text || '',
                        Number(answer.sequence_version || 1),
                        new Date().toISOString()
                    )
                }
            })

            transaction(answers)

            return res.json({
                success: true,
                message: 'Answers synchronized successfully',
                server_current_time: new Date().toISOString()
            })
        } catch (error) {
            console.error('Answer synchronization error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to synchronize answers'
            })
        }
    }
)

// ======================================================
// 8. ABANDON EXAMINATION
// ======================================================

router.post(
    '/attempts/:attemptId/abandon',
    allowRoles('STUDENT'),
    (req, res) => {
        try {
            const attemptId = Number(req.params.attemptId)

            const attempt = db.prepare(`
                SELECT *
                FROM exam_attempts
                WHERE attempt_id = ?
            `).get(attemptId)

            if (!attempt) {
                return res.status(404).json({
                    success: false,
                    message: 'Attempt not found'
                })
            }

            if (Number(attempt.student_id) !== Number(userId(req))) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot abandon another student’s attempt'
                })
            }

            if (attempt.status !== 'IN_PROGRESS') {
                return res.status(400).json({
                    success: false,
                    message: 'Only an active examination can be abandoned'
                })
            }

            if (Date.now() >= Date.parse(attempt.expires_at)) {
                gradeAttempt(attemptId, true)

                return res.status(409).json({
                    success: false,
                    message: 'The examination time has expired and your attempt was automatically submitted'
                })
            }

            const result = db.prepare(`
                UPDATE exam_attempts
                SET status = 'ABANDONED'
                WHERE attempt_id = ?
                AND student_id = ?
                AND status = 'IN_PROGRESS'
            `).run(attemptId, userId(req))

            if (result.changes === 0) {
                return res.status(409).json({
                    success: false,
                    message: 'This attempt is no longer active'
                })
            }

            return res.json({
                success: true,
                message: 'Examination abandoned successfully. You can start a new attempt.',
                attempt_id: attemptId,
                status: 'ABANDONED'
            })
        } catch (error) {
            console.error('Abandon examination error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to abandon examination'
            })
        }
    }
)

// ======================================================
// 9. SUBMIT EXAMINATION
// ======================================================

router.post(
    '/attempts/:attemptId/submit',
    allowRoles('STUDENT'),
    (req, res) => {
        try {
            const attemptId = Number(req.params.attemptId)

            const attempt = db.prepare(`
                SELECT * FROM exam_attempts
                WHERE attempt_id = ?
            `).get(attemptId)

            if (!attempt) {
                return res.status(404).json({
                    success: false,
                    message: 'Attempt not found'
                })
            }

            if (Number(attempt.student_id) !== Number(userId(req))) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot submit this attempt'
                })
            }

            if (attempt.status !== 'IN_PROGRESS') {
                return res.json({
                    success: true,
                    message: 'Examination was already submitted',
                    status: attempt.status,
                    total_marks: attempt.total_marks
                })
            }

            const automatic =
                Date.now() >= Date.parse(attempt.expires_at) ||
                req.body.auto_submit === true

            const result = gradeAttempt(attemptId, automatic)

            if (!result) {
                return res.status(400).json({
                    success: false,
                    message: 'Unable to submit this examination'
                })
            }

            return res.json({
                success: true,
                message: automatic
                    ? 'Examination automatically submitted'
                    : 'Examination submitted successfully',
                ...result
            })
        } catch (error) {
            console.error('Submit examination error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to submit examination'
            })
        }
    }
)

// ======================================================
// 10. GET ALL SUBMITTED ATTEMPTS FOR EVALUATION
// ======================================================

router.get(
    '/:examId/evaluations',
    allowRoles('EXAMINER', 'ADMIN'),
    (req, res) => {
        try {
            const examId = Number(req.params.examId)
            const exam = getExam(examId)

            if (!exam) {
                return res.status(404).json({
                    success: false,
                    message: 'Examination not found'
                })
            }

            if (!examinerOwnsExam(exam, req)) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot view this examination'
                })
            }

            const attempts = db.prepare(`
                SELECT
                    ea.attempt_id,
                    ea.student_id,
                    ea.submitted_at,
                    ea.status,
                    ea.total_marks,
                    u.name AS student_name,
                    u.university_roll_no
                FROM exam_attempts ea
                JOIN users u ON u.user_id = ea.student_id
                WHERE ea.exam_id = ?
                AND ea.status IN (
                    'AUTO_SUBMITTED',
                    'PENDING_MANUAL_REVIEW',
                    'GRADED',
                    'PUBLISHED'
                )
                ORDER BY ea.submitted_at DESC
            `).all(examId)

            const getAnswers = db.prepare(`
                SELECT
                    q.question_id,
                    q.question_text,
                    q.question_type,
                    q.marks AS maximum_marks,
                    sa.answer_text,
                    sa.marks_awarded,
                    sa.feedback
                FROM questions q
                LEFT JOIN student_answers sa
                    ON sa.question_id = q.question_id
                    AND sa.attempt_id = ?
                WHERE q.exam_id = ?
                ORDER BY q.question_order ASC, q.question_id ASC
            `)

            const getMcqMarks = db.prepare(`
                SELECT COALESCE(SUM(
                    CASE
                        WHEN TRIM(COALESCE(sa.answer_text, '')) =
                             TRIM(COALESCE(q.correct_option_id, ''))
                        THEN q.marks
                        ELSE q.negative_marks * -1
                    END
                ), 0) AS mcq_marks
                FROM questions q
                LEFT JOIN student_answers sa
                    ON sa.question_id = q.question_id
                    AND sa.attempt_id = ?
                WHERE q.exam_id = ?
                AND q.question_type = 'MCQ'
                AND sa.answer_id IS NOT NULL
            `)

            const result = attempts.map(attempt => {
                const answers = getAnswers.all(
                    attempt.attempt_id,
                    examId
                )

                const mcq = getMcqMarks.get(
                    attempt.attempt_id,
                    examId
                )

                return {
                    ...attempt,
                    mcq_marks: Number(mcq.mcq_marks || 0),
                    answers: answers.map(answer => ({
                        ...answer,
                        answer_text: answer.answer_text || '',
                        feedback: answer.feedback || ''
                    }))
                }
            })

            return res.json({
                success: true,
                exam_title: exam.title,
                total_submissions: result.length,
                pending_evaluations: result.filter(
                    attempt => attempt.status === 'PENDING_MANUAL_REVIEW'
                ).length,
                evaluations: result
            })
        } catch (error) {
            console.error('Fetch evaluations error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch evaluations'
            })
        }
    }
)

// ======================================================
// 11. SAVE EXAMINER EVALUATION
// ======================================================

router.post(
    '/attempts/:attemptId/evaluate',
    allowRoles('EXAMINER', 'ADMIN'),
    (req, res) => {
        try {
            const attemptId = Number(req.params.attemptId)

            const attempt = db.prepare(`
                SELECT *
                FROM exam_attempts
                WHERE attempt_id = ?
            `).get(attemptId)

            if (!attempt) {
                return res.status(404).json({
                    success: false,
                    message: 'Attempt not found'
                })
            }

            const exam = getExam(attempt.exam_id)

            if (!exam || !examinerOwnsExam(exam, req)) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot evaluate this attempt'
                })
            }

            if (attempt.status !== 'PENDING_MANUAL_REVIEW') {
                return res.status(400).json({
                    success: false,
                    message: 'This attempt is not awaiting manual evaluation'
                })
            }

            const evaluations = Array.isArray(req.body.evaluations)
                ? req.body.evaluations
                : Array.isArray(req.body.answers)
                    ? req.body.answers
                    : []

            if (evaluations.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No evaluations were provided'
                })
            }

            const getQuestion = db.prepare(`
                SELECT marks, question_type
                FROM questions
                WHERE exam_id = ?
                AND question_id = ?
            `)

            const updateAnswer = db.prepare(`
                UPDATE student_answers
                SET marks_awarded = ?,
                    feedback = ?
                WHERE attempt_id = ?
                AND question_id = ?
            `)

            const transaction = db.transaction(items => {
                for (const item of items) {
                    const question = getQuestion.get(
                        attempt.exam_id,
                        Number(item.question_id)
                    )

                    if (
                        !question ||
                        question.question_type !== 'DESCRIPTIVE'
                    ) {
                        throw new Error('Invalid descriptive question')
                    }

                    const marks = Number(item.marks_awarded)

                    if (
                        !Number.isFinite(marks) ||
                        marks < 0 ||
                        marks > Number(question.marks)
                    ) {
                        throw new Error(
                            'Marks must be between zero and maximum marks'
                        )
                    }

                    const updated = updateAnswer.run(
                        marks,
                        item.feedback || '',
                        attemptId,
                        Number(item.question_id)
                    )

                    if (updated.changes === 0) {
                        throw new Error(
                            'Student answer record not found'
                        )
                    }
                }
            })

            transaction(evaluations)

            const remaining = db.prepare(`
                SELECT COUNT(*) AS count
                FROM questions q
                LEFT JOIN student_answers sa
                    ON sa.question_id = q.question_id
                    AND sa.attempt_id = ?
                WHERE q.exam_id = ?
                AND q.question_type = 'DESCRIPTIVE'
                AND (
                    sa.answer_id IS NULL
                    OR sa.marks_awarded IS NULL
                )
            `).get(attemptId, attempt.exam_id)

            let finalMarks = Number(attempt.total_marks || 0)

            if (remaining.count === 0) {
                const totals = db.prepare(`
                    SELECT COALESCE(SUM(marks_awarded), 0) AS total
                    FROM student_answers
                    WHERE attempt_id = ?
                `).get(attemptId)

                finalMarks = Number(totals.total || 0)

                db.prepare(`
                    UPDATE exam_attempts
                    SET total_marks = ?,
                        status = 'GRADED'
                    WHERE attempt_id = ?
                `).run(finalMarks, attemptId)
            }

            return res.json({
                success: true,
                message: remaining.count === 0
                    ? 'Evaluation completed successfully'
                    : 'Evaluation saved successfully',
                pending_answers: remaining.count,
                final_marks: finalMarks
            })
        } catch (error) {
            console.error('Manual evaluation error:', error)

            return res.status(500).json({
                success: false,
                message: error.message || 'Unable to save evaluation'
            })
        }
    }
)

// ======================================================
// 12. PUBLISH EXAMINATION RESULTS
// ======================================================

router.post(
    '/:examId/publish',
    allowRoles('EXAMINER', 'ADMIN'),
    (req, res) => {
        try {
            const examId = Number(req.params.examId)
            const exam = getExam(examId)

            if (!exam) {
                return res.status(404).json({
                    success: false,
                    message: 'Examination not found'
                })
            }

            if (!examinerOwnsExam(exam, req)) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot publish these results'
                })
            }

            const pending = db.prepare(`
                SELECT COUNT(*) AS count
                FROM exam_attempts
                WHERE exam_id = ?
                AND status = 'PENDING_MANUAL_REVIEW'
            `).get(examId)

            if (pending.count > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please complete all descriptive evaluations before publishing'
                })
            }

            const result = db.prepare(`
                UPDATE exam_attempts
                SET status = 'PUBLISHED'
                WHERE exam_id = ?
                AND status IN ('GRADED', 'AUTO_SUBMITTED')
            `).run(examId)

            return res.json({
                success: true,
                message: 'Results published successfully',
                published_count: result.changes
            })
        } catch (error) {
            console.error('Publish results error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to publish results'
            })
        }
    }
)

// ======================================================
// 13. GET PUBLISHED RESULTS FOR STUDENT
// ======================================================

router.get(
    '/results/mine',
    allowRoles('STUDENT'),
    (req, res) => {
        try {
            const results = db.prepare(`
                SELECT
                    ea.attempt_id,
                    ea.exam_id,
                    ea.total_marks,
                    ea.submitted_at,
                    ea.status,
                    e.title,
                    e.subject
                FROM exam_attempts ea
                JOIN examinations e
                    ON e.exam_id = ea.exam_id
                WHERE ea.student_id = ?
                AND ea.status = 'PUBLISHED'
                ORDER BY ea.submitted_at DESC
            `).all(userId(req))

            return res.json({
                success: true,
                results
            })
        } catch (error) {
            console.error('Student results error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch results'
            })
        }
    }
)

module.exports = router
