
import { useState, useEffect, useRef } from 'react'
import './StudentExam.css'
import { saveAnswer, getSavedAnswers } from './examStorage'

const API_URL = 'http://localhost:5000/api/v1/exams'

function StudentExam({ exam }) {
    const [questions, setQuestions] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')

    const [started, setStarted] = useState(false)
    const [agreed, setAgreed] = useState(false)
    const [attempt, setAttempt] = useState(null)

    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [markedQuestions, setMarkedQuestions] = useState([])

    const [submitted, setSubmitted] = useState(false)
    const [abandoned, setAbandoned] = useState(false)
    const [submissionResult, setSubmissionResult] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [abandoning, setAbandoning] = useState(false)

    const [remainingSeconds, setRemainingSeconds] = useState(0)
    const [saveStatus, setSaveStatus] = useState('Not started')

    const sequenceVersion = useRef(0)
    const submissionLock = useRef(false)

    const token = sessionStorage.getItem('examease_token')
    const examName = exam?.name || 'Examination'
    const examDuration = exam?.duration || '60 minutes'

    // Load actual questions from the database
    useEffect(() => {
        let active = true

        const fetchQuestions = async () => {
            try {
                setLoading(true)
                setLoadError('')

                const response = await fetch(
                    `${API_URL}/${exam.id}/questions`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.message || 'Could not load questions')
                }

                if (active) {
                    const formatted = (data.questions || []).map((q) => ({
                        id: q.question_id,
                        text: q.question_text,
                        type: q.question_type,
                        options: Array.isArray(q.options) ? q.options : [],
                        marks: q.marks
                    }))

                    setQuestions(formatted)
                }
            } catch (error) {
                if (active) {
                    setLoadError(error.message)
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        fetchQuestions()

        return () => {
            active = false
        }
    }, [exam.id, token])

    // Start or resume the server-side examination attempt
    const startExam = async () => {
        try {
            setSaveStatus('Starting examination...')

            const response = await fetch(
                `${API_URL}/${exam.id}/attempts/start`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Could not start examination')
            }

            const currentAttempt = data.attempt

            if (!currentAttempt?.attempt_id) {
                throw new Error('Server did not return an attempt ID')
            }

            setAttempt(currentAttempt)

            const saved = await getSavedAnswers(
                String(currentAttempt.attempt_id)
            )

            const restored = {}

            saved.forEach((item) => {
                restored[item.questionId] = item.answer

                sequenceVersion.current = Math.max(
                    sequenceVersion.current,
                    Number(item.sequence_version || 0)
                )
            })

            setAnswers(restored)

            const serverTime = Date.parse(data.server_current_time)
            const expiresAt = Date.parse(currentAttempt.expires_at)

            if (!Number.isFinite(serverTime) || !Number.isFinite(expiresAt)) {
                throw new Error('Invalid examination timer received from server')
            }

            const offset = serverTime - Date.now()
            const remaining = Math.max(
                0,
                Math.ceil((expiresAt - (Date.now() + offset)) / 1000)
            )

            setRemainingSeconds(remaining)
            setStarted(true)
            setSaveStatus('Examination started. Answers save automatically.')
        } catch (error) {
            setLoadError(error.message)
        }
    }

    // Synchronize locally saved answers with the server
    const synchronizeAnswers = async (attemptId) => {
        if (!attemptId) return

        const saved = await getSavedAnswers(String(attemptId))

        if (saved.length === 0) return

        const answerPayload = saved.map((item) => ({
            question_id: Number(item.questionId),
            answer_text: String(item.answer ?? ''),
            sequence_version: Number(item.sequence_version || 1)
        }))

        const response = await fetch(
            `${API_URL}/attempts/${attemptId}/sync`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    answers: answerPayload
                })
            }
        )

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.message || 'Answer synchronization failed')
        }

        return data
    }

    // Save answer locally first, then synchronize with server
    const handleAnswer = async (value) => {
        if (!attempt || !question) return

        const questionId = question.id
        const version = ++sequenceVersion.current

        setAnswers((previous) => ({
            ...previous,
            [questionId]: value
        }))

        try {
            setSaveStatus('Saving answer...')

            await saveAnswer(
                String(attempt.attempt_id),
                questionId,
                value,
                version
            )

            setSaveStatus('Saved locally. Synchronizing...')

            try {
                await synchronizeAnswers(attempt.attempt_id)
                setSaveStatus('Answer saved and synchronized')
            } catch (error) {
                console.error('Synchronization pending:', error)
                setSaveStatus('Saved locally. Waiting for connection.')
            }
        } catch (error) {
            console.error('Local answer save failed:', error)
            setSaveStatus('Could not save answer')
        }
    }

    // Automatic synchronization every 15 seconds and when internet returns
    useEffect(() => {
        if (!started || !attempt || submitted || abandoned) return

        const sync = async () => {
            try {
                await synchronizeAnswers(attempt.attempt_id)
                setSaveStatus('Answers synchronized')
            } catch (error) {
                console.error('Automatic sync:', error)
                setSaveStatus('Waiting to synchronize')
            }
        }

        const interval = setInterval(sync, 15000)

        window.addEventListener('online', sync)

        return () => {
            clearInterval(interval)
            window.removeEventListener('online', sync)
        }
    }, [started, attempt, submitted, abandoned])

    // Countdown using the server-provided expiry time
    useEffect(() => {
        if (!started || !attempt || submitted || abandoned) return

        const updateTimer = () => {
            const expiresAt = Date.parse(attempt.expires_at)

            setRemainingSeconds(
                Math.max(
                    0,
                    Math.ceil((expiresAt - Date.now()) / 1000)
                )
            )
        }

        updateTimer()

        const timer = setInterval(updateTimer, 1000)

        return () => clearInterval(timer)
    }, [started, attempt, submitted, abandoned])

    // Submit examination, including automatic submission at expiry
    const submitExam = async (automatic = false) => {
        if (!attempt || submissionLock.current || submitted || abandoned) return

        if (!automatic && !window.confirm(
            'Are you sure you want to submit your examination?'
        )) {
            return
        }

        submissionLock.current = true
        setSubmitting(true)

        try {
            await synchronizeAnswers(attempt.attempt_id)

            const response = await fetch(
                `${API_URL}/attempts/${attempt.attempt_id}/submit`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Submission failed')
            }

            setSubmissionResult(data)
            setSubmitted(true)
            setSaveStatus('Examination submitted successfully')
        } catch (error) {
            submissionLock.current = false
            setLoadError(
                `${error.message}. Please check your internet connection and try again.`
            )
        } finally {
            setSubmitting(false)
        }
    }

    // Abandon examination without deleting saved answers
    const abandonExam = async () => {
        if (!attempt || abandoning || submitting || submitted || abandoned) return

        const confirmed = window.confirm(
            'Are you sure you want to abandon this examination? Your current attempt will be marked as ABANDONED. Your saved answers will be preserved, but you will need to start a new attempt.'
        )

        if (!confirmed) return

        setAbandoning(true)
        setLoadError('')

        try {
            const response = await fetch(
                `${API_URL}/attempts/${attempt.attempt_id}/abandon`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Could not abandon examination')
            }

            setAbandoned(true)
            setStarted(false)
            setSaveStatus('Examination abandoned')
        } catch (error) {
            setLoadError(error.message)
        } finally {
            setAbandoning(false)
        }
    }

    // Automatically submit when time reaches zero
    useEffect(() => {
        if (
            started &&
            remainingSeconds <= 0 &&
            !submitted &&
            !abandoned &&
            !submitting
        ) {
            submitExam(true)
        }
    }, [started, remainingSeconds, submitted, abandoned, submitting])

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60)
        const remaining = seconds % 60

        return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    }

    const question = questions[currentQuestion]

    const toggleReview = () => {
        if (!question) return

        setMarkedQuestions((previous) =>
            previous.includes(question.id)
                ? previous.filter((id) => id !== question.id)
                : [...previous, question.id]
        )
    }

    const getQuestionStatus = (id) => {
        if (markedQuestions.includes(id)) return 'review'
        if (answers[id]) return 'answered'
        return 'not-answered'
    }

    // Loading screen
    if (loading) {
        return (
            <div className="student-exam-page">
                <h2>Loading your examination...</h2>
            </div>
        )
    }

    // Error screen
    if (loadError && questions.length === 0) {
        return (
            <div className="student-exam-page">
                <h2>Unable to load examination</h2>
                <p>{loadError}</p>
            </div>
        )
    }

    // No questions
    if (questions.length === 0) {
        return (
            <div className="student-exam-page">
                <h2>No questions available</h2>
                <p>Please contact your examiner.</p>
            </div>
        )
    }

    // Abandoned examination screen
    if (abandoned) {
        return (
            <div className="student-exam-page">
                <nav className="student-exam-nav">
                    <h2>ExamEase</h2>
                    <span>Student Portal</span>
                </nav>

                <div className="instructions-card">
                    <h1>Examination Abandoned</h1>
                    <p>Your examination attempt has been marked as abandoned.</p>
                    <p>Your previously saved answers have not been deleted.</p>

                    <button
                        className="start-exam-btn"
                        onClick={() => window.location.reload()}
                    >
                        Return to Student Dashboard
                    </button>
                </div>
            </div>
        )
    }

    // Submission result
    if (submitted) {
        return (
            <div className="student-exam-page">
                <nav className="student-exam-nav">
                    <h2>ExamEase</h2>
                    <span>Student Portal</span>
                </nav>

                <div className="instructions-card">
                    <h1>Examination Submitted!</h1>

                    <p>
                        {submissionResult?.message ||
                            'Your examination was submitted successfully.'}
                    </p>

                    <div className="exam-details">
                        <p><strong>Examination:</strong> {examName}</p>
                        <p><strong>Total Questions:</strong> {questions.length}</p>
                        <p><strong>Answered:</strong> {Object.values(answers).filter(Boolean).length}</p>
                        <p><strong>Unanswered:</strong> {questions.length - Object.values(answers).filter(Boolean).length}</p>
                        <p><strong>MCQ Marks:</strong> {submissionResult?.mcq_marks ?? 'Pending'}</p>
                        <p><strong>Status:</strong> {submissionResult?.status}</p>
                        <p>{submissionResult?.result}</p>
                    </div>
                </div>
            </div>
        )
    }

    // Instructions screen
    if (!started) {
        return (
            <div className="student-exam-page">
                <nav className="student-exam-nav">
                    <h2>ExamEase</h2>
                    <span>Student Portal</span>
                </nav>

                <div className="instructions-card">
                    <h1>Examination Instructions</h1>

                    <div className="exam-details">
                        <p><strong>Subject:</strong> {examName}</p>
                        <p><strong>Duration:</strong> {examDuration}</p>
                        <p><strong>Total Questions:</strong> {questions.length}</p>
                        <p><strong>Question Types:</strong> MCQ and Descriptive</p>
                        <p><strong>Scheduled Date:</strong> {exam?.date || 'Not specified'}</p>
                    </div>

                    <h3>Important Instructions</h3>

                    <ul>
                        <li>Read every question carefully.</li>
                        <li>Select an option for MCQ questions.</li>
                        <li>Type your answer for descriptive questions.</li>
                        <li>Navigate between questions using the buttons.</li>
                        <li>Your answers are saved locally and synchronized with the server.</li>
                        <li>The examination is automatically submitted when time expires.</li>
                    </ul>

                    <label className="agreement">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                        />
                        I have read and understood the examination instructions.
                    </label>

                    {loadError && <p style={{ color: 'red' }}>{loadError}</p>}

                    <button
                        className="start-exam-btn"
                        disabled={!agreed}
                        onClick={startExam}
                    >
                        Start Examination
                    </button>
                </div>
            </div>
        )
    }

    // Active examination
    return (
        <div className="student-exam-page">
            <nav className="student-exam-nav">
                <h2>ExamEase</h2>
                <span>{examName} Examination</span>
            </nav>

            <main className="exam-layout">
                <section className="question-section">
                    <div className="question-top">
                        <h2>
                            Question {currentQuestion + 1} of {questions.length}
                        </h2>
                        <span>{question?.type}</span>
                    </div>

                    <div className="exam-timer">
                        <span>Time Remaining</span>
                        <strong>{formatTime(remainingSeconds)}</strong>
                    </div>

                    {question && (
                        <div className="question-card">
                            <h3>{question.text}</h3>

                            <p>Marks: {question.marks}</p>

                            {question.type === 'MCQ' ? (
                                <div className="options-list">
                                    {question.options.map((option, index) => (
                                        <label
                                            className={`option-item ${answers[question.id] === option
                                                ? 'selected'
                                                : ''
                                                }`}
                                            key={index}
                                        >
                                            <input
                                                type="radio"
                                                name={`question-${question.id}`}
                                                checked={answers[question.id] === option}
                                                onChange={() => handleAnswer(option)}
                                            />

                                            <span>
                                                {String.fromCharCode(65 + index)}.
                                            </span>

                                            {option}
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <textarea
                                    rows="7"
                                    value={answers[question.id] || ''}
                                    onChange={(e) => handleAnswer(e.target.value)}
                                    placeholder="Type your answer here..."
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        marginTop: '15px',
                                        resize: 'vertical'
                                    }}
                                />
                            )}
                        </div>
                    )}

                    <p className="save-status">
                        <strong>Autosave:</strong> {saveStatus}
                    </p>

                    {loadError && (
                        <p style={{ color: 'red' }}>{loadError}</p>
                    )}

                    <div className="question-actions">
                        <button
                            className="review-btn"
                            onClick={toggleReview}
                        >
                            {markedQuestions.includes(question?.id)
                                ? 'Remove Review'
                                : 'Mark for Review'}
                        </button>

                        <div>
                            <button
                                className="previous-btn"
                                disabled={currentQuestion === 0}
                                onClick={() => setCurrentQuestion((p) => p - 1)}
                            >
                                Previous
                            </button>

                            <button
                                className="next-btn"
                                disabled={currentQuestion === questions.length - 1}
                                onClick={() => setCurrentQuestion((p) => p + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </section>

                <aside className="question-palette">
                    <h3>Question Palette</h3>

                    <div className="palette-grid">
                        {questions.map((item, index) => (
                            <button
                                key={item.id}
                                className={`palette-button ${getQuestionStatus(item.id)
                                    } ${currentQuestion === index ? 'current' : ''}`}
                                onClick={() => setCurrentQuestion(index)}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>

                    <div className="palette-legend">
                        <p><span className="legend-dot answered-dot"></span> Answered</p>
                        <p><span className="legend-dot unanswered-dot"></span> Not Answered</p>
                        <p><span className="legend-dot review-dot"></span> Marked for Review</p>
                    </div>

                    <div className="answer-summary">
                        <p>Answered: {Object.values(answers).filter(Boolean).length}</p>
                        <p>Marked for Review: {markedQuestions.length}</p>
                        <p>Total Questions: {questions.length}</p>
                    </div>

                    <button
                        className="submit-exam-btn"
                        disabled={submitting || abandoning}
                        onClick={() => submitExam(false)}
                    >
                        {submitting ? 'Submitting...' : 'Submit Examination'}
                    </button>

                    <button
                        type="button"
                        className="review-btn"
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            backgroundColor: '#b42318',
                            color: '#ffffff'
                        }}
                        disabled={submitting || abandoning}
                        onClick={abandonExam}
                    >
                        {abandoning ? 'Abandoning...' : 'Abandon Examination'}
                    </button>
                </aside>
            </main>
        </div>
    )
}

export default StudentExam
