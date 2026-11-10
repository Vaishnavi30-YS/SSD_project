


import { useState, useEffect, useRef } from 'react'
import './StudentExam.css'
import { saveAnswer, getSavedAnswers } from './examStorage'

function StudentExam({ exam }) {
    const [started, setStarted] = useState(false)
    const [agreed, setAgreed] = useState(false)
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [markedQuestions, setMarkedQuestions] = useState([])
    const [submitted, setSubmitted] = useState(false)
    const [autoSubmitted, setAutoSubmitted] = useState(false)
    const [saveStatus, setSaveStatus] = useState('Not started')

    const durationMinutes = Number.parseInt(exam?.duration, 10) || 60

    const [remainingSeconds, setRemainingSeconds] = useState(
        durationMinutes * 60
    )

    const attemptId = `demo_${exam?.id || 'default'}`
    const sequenceVersion = useRef(0)

    const examName = exam?.name || 'Data Structures'
    const examDuration = exam?.duration || '60 minutes'

    const questions = [
        {
            id: 1,
            text: 'Which data structure follows the LIFO principle?',
            options: ['Queue', 'Stack', 'Linked List', 'Tree']
        },
        {
            id: 2,
            text: 'Which of the following is a relational database?',
            options: ['MongoDB', 'Redis', 'MySQL', 'Neo4j']
        },
        {
            id: 3,
            text: 'Which operating system component manages processes?',
            options: ['Compiler', 'Process Scheduler', 'Browser', 'Text Editor']
        },
        {
            id: 4,
            text: 'Which language is primarily used for styling web pages?',
            options: ['HTML', 'Python', 'CSS', 'Java']
        },
        {
            id: 5,
            text: 'What does CPU stand for?',
            options: [
                'Central Processing Unit',
                'Computer Personal Unit',
                'Central Program Utility',
                'Control Processing User'
            ]
        }
    ]

    const question = questions[currentQuestion]

    // Restore previously saved answers
    useEffect(() => {
        let active = true

        const restoreAnswers = async () => {
            try {
                const savedAnswers = await getSavedAnswers(attemptId)

                if (!active) return

                const restored = {}

                savedAnswers.forEach((item) => {
                    restored[item.questionId] = item.answer

                    sequenceVersion.current = Math.max(
                        sequenceVersion.current,
                        item.sequence_version || 0
                    )
                })

                setAnswers(restored)
                setSaveStatus(
                    savedAnswers.length > 0
                        ? 'Previous answers restored'
                        : 'Ready to save answers'
                )
            } catch (error) {
                console.error('Could not restore answers:', error)
                setSaveStatus('Local storage unavailable')
            }
        }

        restoreAnswers()

        return () => {
            active = false
        }
    }, [attemptId])

    // Countdown timer
    useEffect(() => {
        if (!started || submitted) return

        const timer = setInterval(() => {
            setRemainingSeconds((previous) => {
                if (previous <= 1) {
                    clearInterval(timer)
                    setAutoSubmitted(true)
                    setSubmitted(true)
                    return 0
                }

                return previous - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [started, submitted])

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60)
        const remaining = seconds % 60

        return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    }

    // Save selected answer to IndexedDB
    const handleAnswer = async (option) => {
        const questionId = question.id

        setAnswers((previous) => ({
            ...previous,
            [questionId]: option
        }))

        const nextVersion = ++sequenceVersion.current

        try {
            setSaveStatus('Saving...')

            await saveAnswer(
                attemptId,
                questionId,
                option,
                nextVersion
            )

            setSaveStatus('All answers saved locally')
        } catch (error) {
            console.error('Answer save failed:', error)
            setSaveStatus('Could not save answer')
        }
    }

    const toggleReview = () => {
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

    const handleSubmit = () => {
        const confirmSubmit = window.confirm(
            'Are you sure you want to submit your examination?'
        )

        if (confirmSubmit) {
            setAutoSubmitted(false)
            setSubmitted(true)
        }
    }

    // Submission screen
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
                        {autoSubmitted
                            ? 'Your examination was automatically submitted because the timer expired.'
                            : 'Your examination has been submitted successfully.'}
                    </p>

                    <div className="exam-details">
                        <p><strong>Examination:</strong> {examName}</p>
                        <p><strong>Total Questions:</strong> {questions.length}</p>
                        <p><strong>Answered:</strong> {Object.keys(answers).length}</p>
                        <p><strong>Unanswered:</strong> {questions.length - Object.keys(answers).length}</p>
                    </div>

                    <p>
                        Demo only: answers are stored locally and have not
                        been submitted to a backend server.
                    </p>
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
                        <p><strong>Question Type:</strong> Multiple Choice</p>
                        <p><strong>Scheduled Date:</strong> {exam?.date || 'Not specified'}</p>
                    </div>

                    <h3>Important Instructions</h3>

                    <ul>
                        <li>Read every question carefully before answering.</li>
                        <li>Select one option for each MCQ question.</li>
                        <li>You can navigate between questions.</li>
                        <li>You can mark questions for review.</li>
                        <li>Answers are saved locally in your browser.</li>
                        <li>The examination will be submitted when the timer expires.</li>
                    </ul>

                    <label className="agreement">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                        />
                        I have read and understood the examination instructions.
                    </label>

                    <button
                        className="start-exam-btn"
                        disabled={!agreed}
                        onClick={() => setStarted(true)}
                    >
                        Start Examination
                    </button>
                </div>
            </div>
        )
    }

    // Active examination screen
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
                        <span>MCQ</span>
                    </div>

                    <div className="exam-timer">
                        <span>Time Remaining</span>
                        <strong>{formatTime(remainingSeconds)}</strong>
                    </div>

                    <div className="question-card">
                        <h3>{question.text}</h3>

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
                    </div>

                    <p className="save-status">
                        <strong>Autosave:</strong> {saveStatus}
                    </p>

                    <div className="question-actions">
                        <button
                            className="review-btn"
                            onClick={toggleReview}
                        >
                            {markedQuestions.includes(question.id)
                                ? 'Remove Review'
                                : 'Mark for Review'}
                        </button>

                        <div>
                            <button
                                className="previous-btn"
                                disabled={currentQuestion === 0}
                                onClick={() =>
                                    setCurrentQuestion((previous) => previous - 1)
                                }
                            >
                                Previous
                            </button>

                            <button
                                className="next-btn"
                                disabled={currentQuestion === questions.length - 1}
                                onClick={() =>
                                    setCurrentQuestion((previous) => previous + 1)
                                }
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
                                    } ${currentQuestion === index ? 'current' : ''
                                    }`}
                                onClick={() => setCurrentQuestion(index)}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>

                    <div className="palette-legend">
                        <p>
                            <span className="legend-dot answered-dot"></span>
                            Answered
                        </p>

                        <p>
                            <span className="legend-dot unanswered-dot"></span>
                            Not Answered
                        </p>

                        <p>
                            <span className="legend-dot review-dot"></span>
                            Marked for Review
                        </p>
                    </div>

                    <div className="answer-summary">
                        <p>Answered: {Object.keys(answers).length}</p>
                        <p>Marked for Review: {markedQuestions.length}</p>
                        <p>Total Questions: {questions.length}</p>
                    </div>

                    <button
                        className="submit-exam-btn"
                        onClick={handleSubmit}
                    >
                        Submit Examination
                    </button>
                </aside>
            </main>
        </div>
    )
}

export default StudentExam
