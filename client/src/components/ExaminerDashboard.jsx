
import { useState, useEffect, useRef } from 'react'
import './ExaminerDashboard.css'
import QuestionManagement from './QuestionManagement'

const API_URL = 'http://localhost:5000/api/v1/exams'

function ExaminerDashboard() {
    const [showForm, setShowForm] = useState(false)
    const [examinations, setExaminations] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [profileOpen, setProfileOpen] = useState(false)

    const profileRef = useRef(null)
    const evaluationSectionRef = useRef(null)

    let user = {}

    try {
        user = JSON.parse(sessionStorage.getItem('examease_user') || '{}')
    } catch {
        user = {}
    }

    const examinerName =
        user.name || user.full_name || user.username || 'Examiner'

    const examinerId =
        user.university_roll_no ||
        user.registration_number ||
        user.reg_no ||
        user.examiner_id ||
        user.employee_id ||
        'Not available'

    const profileInitial = examinerName.charAt(0).toUpperCase()

    const [examData, setExamData] = useState({
        title: '',
        subject: '',
        duration: '',
        date: '',
        deliveryMode: ''
    })

    const [selectedExam, setSelectedExam] = useState(null)
    const [evaluations, setEvaluations] = useState([])
    const [evaluationLoading, setEvaluationLoading] = useState(false)
    const [drafts, setDrafts] = useState({})
    const [evaluating, setEvaluating] = useState(false)
    const [publishing, setPublishing] = useState(false)

    useEffect(() => {
        const handleOutsideClick = event => {
            if (
                profileRef.current &&
                !profileRef.current.contains(event.target)
            ) {
                setProfileOpen(false)
            }
        }

        const handleEscape = event => {
            if (event.key === 'Escape') setProfileOpen(false)
        }

        document.addEventListener('mousedown', handleOutsideClick)
        document.addEventListener('keydown', handleEscape)

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [])

    useEffect(() => {
        if (selectedExam) {
            evaluationSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })
        }
    }, [selectedExam])

    const handleLogout = () => {
        if (!window.confirm('Are you sure you want to log out?')) return

        sessionStorage.removeItem('examease_token')
        sessionStorage.removeItem('examease_user')
        window.location.reload()
    }

    const getToken = () => sessionStorage.getItem('examease_token')

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
    })

    const normalizeExam = exam => ({
        ...exam,
        id: exam.exam_id ?? exam.id,
        duration: exam.duration_minutes ?? exam.duration,
        date: exam.scheduled_start ?? exam.date,
        deliveryMode: exam.delivery_mode ?? exam.deliveryMode
    })

    const loadExaminations = async () => {
        try {
            setLoading(true)

            const response = await fetch(`${API_URL}/mine`, {
                headers: getHeaders()
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Could not load examinations.')
            }

            const list = Array.isArray(data)
                ? data
                : data.exams || data.examinations || []

            setExaminations(list.map(normalizeExam))
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadExaminations()
    }, [])

    const handleChange = e => {
        setExamData(previous => ({
            ...previous,
            [e.target.name]: e.target.value
        }))
    }

    const handleCreateExam = async e => {
        e.preventDefault()
        setError('')
        setSuccess('')

        try {
            setSaving(true)

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    title: examData.title.trim(),
                    subject: examData.subject.trim(),
                    description: '',
                    batch: '',
                    duration: Number(examData.duration),
                    date: examData.date,
                    deliveryMode: examData.deliveryMode
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Examination creation failed.')
            }

            setSuccess('Examination saved successfully!')

            setExamData({
                title: '',
                subject: '',
                duration: '',
                date: '',
                deliveryMode: ''
            })

            setShowForm(false)
            await loadExaminations()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const loadEvaluations = async exam => {
        if (!exam?.id) {
            setError('Examination ID is missing.')
            return
        }

        setSelectedExam(exam)
        setEvaluations([])
        setDrafts({})
        setError('')
        setSuccess('')

        try {
            setEvaluationLoading(true)

            const response = await fetch(
                `${API_URL}/${exam.id}/evaluations`,
                { headers: getHeaders() }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Could not load evaluations.')
            }

            const groups = Array.isArray(data.evaluations)
                ? data.evaluations
                : []

            setEvaluations(groups)

            const initialDrafts = {}

            groups.forEach(attempt => {
                ; (attempt.answers || []).forEach(answer => {
                    const key =
                        `${attempt.attempt_id}_${answer.question_id}`

                    initialDrafts[key] = {
                        marks: answer.marks_awarded ?? '',
                        feedback: answer.feedback ?? ''
                    }
                })
            })

            setDrafts(initialDrafts)

            if (groups.length === 0) {
                setSuccess(
                    'No students have submitted this examination yet.'
                )
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setEvaluationLoading(false)
        }
    }

    const updateDraft = (key, field, value) => {
        setDrafts(previous => ({
            ...previous,
            [key]: {
                ...previous[key],
                [field]: value
            }
        }))
    }

    const submitEvaluation = async attempt => {
        setError('')
        setSuccess('')

        const descriptiveAnswers = attempt.answers.filter(
            answer => answer.question_type === 'DESCRIPTIVE'
        )

        const answers = descriptiveAnswers.map(answer => {
            const key =
                `${attempt.attempt_id}_${answer.question_id}`

            const draft = drafts[key] || {}

            return {
                question_id: answer.question_id,
                marks_awarded: Number(draft.marks),
                feedback: draft.feedback || ''
            }
        })

        const invalid = descriptiveAnswers.some(answer => {
            const key =
                `${attempt.attempt_id}_${answer.question_id}`

            const value = drafts[key]?.marks

            return (
                value === '' ||
                value === undefined ||
                !Number.isFinite(Number(value)) ||
                Number(value) < 0 ||
                Number(value) > Number(answer.maximum_marks)
            )
        })

        if (invalid) {
            setError('Enter valid marks for every descriptive question.')
            return
        }

        if (answers.length === 0) {
            setError('There are no descriptive questions to evaluate.')
            return
        }

        try {
            setEvaluating(true)

            const response = await fetch(
                `${API_URL}/attempts/${attempt.attempt_id}/evaluate`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ evaluations: answers })
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Could not save evaluation.')
            }

            setSuccess(
                data.message +
                (data.final_marks !== undefined
                    ? ` Final marks: ${data.final_marks}`
                    : '')
            )

            await loadEvaluations(selectedExam)
        } catch (err) {
            setError(err.message)
        } finally {
            setEvaluating(false)
        }
    }

    const publishResults = async () => {
        if (!selectedExam) return

        if (!window.confirm('Are you sure you want to publish results?')) {
            return
        }

        try {
            setPublishing(true)
            setError('')
            setSuccess('')

            const response = await fetch(
                `${API_URL}/${selectedExam.id}/publish`,
                {
                    method: 'POST',
                    headers: getHeaders()
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Could not publish results.')
            }

            setSuccess(data.message || 'Results published successfully!')

            await loadEvaluations(selectedExam)
            await loadExaminations()
        } catch (err) {
            setError(err.message)
        } finally {
            setPublishing(false)
        }
    }

    const pendingCount = evaluations.filter(
        attempt => attempt.status === 'PENDING_MANUAL_REVIEW'
    ).length

    const publishedCount = examinations.filter(
        exam => String(exam.status).toUpperCase() === 'PUBLISHED'
    ).length

    return (
        <div className="examiner-dashboard">

            <nav className="examiner-nav">
                <h2>ExamEase</h2>

                <div className="examiner-profile" ref={profileRef}>
                    <button
                        type="button"
                        className="examiner-profile-trigger"
                        onClick={() => setProfileOpen(previous => !previous)}
                        aria-expanded={profileOpen}
                    >
                        <span>Examiner Portal</span>

                        <div className="examiner-profile-circle">
                            {profileInitial}
                        </div>

                        <span className="profile-arrow">
                            {profileOpen ? '▲' : '▼'}
                        </span>
                    </button>

                    {profileOpen && (
                        <div className="examiner-profile-dropdown">
                            <div className="examiner-profile-header">
                                <div className="examiner-profile-circle dropdown-avatar">
                                    {profileInitial}
                                </div>

                                <div>
                                    <h3>{examinerName}</h3>
                                    <p>Examiner</p>
                                </div>
                            </div>

                            <div className="examiner-profile-details">
                                <span>Examiner ID</span>
                                <strong>{examinerId}</strong>
                            </div>

                            <div className="examiner-profile-details">
                                <span>Account Role</span>
                                <strong>Examiner</strong>
                            </div>

                            <div className="examiner-profile-divider" />

                            <button
                                type="button"
                                className="examiner-logout-button"
                                onClick={handleLogout}
                            >
                                ↪ Logout
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            <main className="examiner-content">

                <section className="examiner-welcome">
                    <div>
                        <h1>Welcome, Examiner!</h1>
                        <p>Manage examinations, questions and student evaluations.</p>
                    </div>

                    <span className="examiner-icon">👨‍🏫</span>
                </section>

                <section className="examiner-stats">
                    <div className="examiner-stat-card">
                        <h3>{examinations.length}</h3>
                        <p>Total Examinations</p>
                    </div>

                    <div className="examiner-stat-card">
                        <h3>{pendingCount}</h3>
                        <p>Pending Evaluations</p>
                    </div>

                    <div className="examiner-stat-card">
                        <h3>{publishedCount}</h3>
                        <p>Published Examinations</p>
                    </div>
                </section>

                <section className="examiner-actions">

                    <div className="examiner-section-heading">
                        <h2>Examination Management</h2>

                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(!showForm)
                                setError('')
                                setSuccess('')
                            }}
                        >
                            {showForm ? 'Close Form' : '+ Create Examination'}
                        </button>
                    </div>

                    {error && (
                        <p role="alert" style={{ color: 'red' }}>{error}</p>
                    )}

                    {success && (
                        <p role="status" style={{ color: 'green' }}>{success}</p>
                    )}

                    {showForm && (
                        <form className="create-exam-form" onSubmit={handleCreateExam}>
                            <h3>Create New Examination</h3>

                            <label>Examination Title</label>
                            <input
                                name="title"
                                value={examData.title}
                                onChange={handleChange}
                                placeholder="Enter examination title"
                                required
                            />

                            <label>Course / Subject</label>
                            <input
                                name="subject"
                                value={examData.subject}
                                onChange={handleChange}
                                placeholder="Enter course name"
                                required
                            />

                            <label>Duration (minutes)</label>
                            <input
                                type="number"
                                name="duration"
                                min="1"
                                value={examData.duration}
                                onChange={handleChange}
                                required
                            />

                            <label>Examination Date</label>
                            <input
                                type="datetime-local"
                                name="date"
                                value={examData.date}
                                onChange={handleChange}
                                required
                            />

                            <label>Question Delivery Mode</label>
                            <select
                                name="deliveryMode"
                                value={examData.deliveryMode}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select delivery mode</option>
                                <option value="FREE_NAVIGATION">
                                    All Questions at Once
                                </option>
                                <option value="SEQUENTIAL_ONE_BY_ONE">
                                    One Question at a Time
                                </option>
                            </select>

                            <button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Examination'}
                            </button>
                        </form>
                    )}

                    <div className="created-exams">
                        <h3>Created Examinations</h3>

                        {loading ? (
                            <p>Loading examinations...</p>
                        ) : examinations.length === 0 ? (
                            <p>No examinations created yet.</p>
                        ) : (
                            examinations.map(exam => (
                                <div className="created-exam-card" key={exam.id}>
                                    <h3>{exam.title}</h3>
                                    <p>Subject: {exam.subject}</p>
                                    <p>Duration: {exam.duration} minutes</p>
                                    <p>
                                        Date: {exam.date
                                            ? new Date(exam.date).toLocaleString()
                                            : 'Not specified'}
                                    </p>
                                    <p>
                                        Mode: {exam.deliveryMode === 'FREE_NAVIGATION'
                                            ? 'All Questions at Once'
                                            : 'One Question at a Time'}
                                    </p>

                                    <button
                                        type="button"
                                        disabled={evaluationLoading}
                                        onClick={() => loadEvaluations(exam)}
                                    >
                                        View Evaluations
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <QuestionManagement examinations={examinations} />

                <section
                    className="evaluation-section"
                    ref={evaluationSectionRef}
                    style={{ scrollMarginTop: '30px' }}
                >
                    <h2>Evaluation Management</h2>

                    {!selectedExam ? (
                        <p>Select an examination and click View Evaluations.</p>
                    ) : (
                        <>
                            <h3>Selected Examination: {selectedExam.title}</h3>

                            {evaluationLoading ? (
                                <p>Loading student submissions...</p>
                            ) : evaluations.length === 0 ? (
                                <p>No students have submitted this examination yet.</p>
                            ) : (
                                <>
                                    <p>
                                        Total submissions: {evaluations.length}
                                    </p>

                                    {evaluations.map(attempt => (
                                        <div
                                            className="created-exam-card"
                                            key={attempt.attempt_id}
                                        >
                                            <h3>Student: {attempt.student_name}</h3>

                                            <p>
                                                Registration Number:{' '}
                                                {attempt.university_roll_no || 'Not available'}
                                            </p>

                                            <p>Attempt ID: {attempt.attempt_id}</p>

                                            <p>
                                                Submitted: {attempt.submitted_at
                                                    ? new Date(attempt.submitted_at).toLocaleString()
                                                    : 'Not available'}
                                            </p>

                                            <p>
                                                Status: <strong>{attempt.status}</strong>
                                            </p>

                                            <p>MCQ Marks: {attempt.mcq_marks}</p>

                                            <p>
                                                Current Total Marks: {attempt.total_marks ?? 0}
                                            </p>

                                            {(attempt.answers || []).map(answer => {
                                                const key =
                                                    `${attempt.attempt_id}_${answer.question_id}`

                                                const isDescriptive =
                                                    answer.question_type === 'DESCRIPTIVE'

                                                const canEvaluate =
                                                    attempt.status === 'PENDING_MANUAL_REVIEW' &&
                                                    isDescriptive

                                                return (
                                                    <div key={key}>
                                                        <hr />

                                                        <h4>
                                                            {answer.question_text}
                                                        </h4>

                                                        <p>
                                                            Question Type: {answer.question_type}
                                                        </p>

                                                        <p>
                                                            Student Answer:
                                                        </p>

                                                        <p>
                                                            {answer.answer_text ||
                                                                'No answer provided'}
                                                        </p>

                                                        <p>
                                                            Maximum Marks: {answer.maximum_marks}
                                                        </p>

                                                        {isDescriptive && (
                                                            <>
                                                                {canEvaluate ? (
                                                                    <>
                                                                        <label>Marks Awarded</label>

                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max={answer.maximum_marks}
                                                                            value={drafts[key]?.marks ?? ''}
                                                                            onChange={e =>
                                                                                updateDraft(
                                                                                    key,
                                                                                    'marks',
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                        />

                                                                        <label>Feedback</label>

                                                                        <textarea
                                                                            value={drafts[key]?.feedback ?? ''}
                                                                            onChange={e =>
                                                                                updateDraft(
                                                                                    key,
                                                                                    'feedback',
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            placeholder="Enter feedback"
                                                                        />
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <p>
                                                                            Marks Awarded:{' '}
                                                                            {answer.marks_awarded ?? 'Not evaluated'}
                                                                        </p>
                                                                        <p>
                                                                            Feedback: {answer.feedback || 'No feedback'}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}

                                                        {!isDescriptive && (
                                                            <p>
                                                                MCQ Marks Awarded: {answer.marks_awarded ?? 0}
                                                            </p>
                                                        )}
                                                    </div>
                                                )
                                            })}

                                            {attempt.status === 'PENDING_MANUAL_REVIEW' && (
                                                <button
                                                    type="button"
                                                    disabled={evaluating}
                                                    onClick={() => submitEvaluation(attempt)}
                                                >
                                                    {evaluating
                                                        ? 'Saving...'
                                                        : 'Save Student Evaluation'}
                                                </button>
                                            )}

                                            {attempt.status !== 'PENDING_MANUAL_REVIEW' && (
                                                <p>
                                                    <strong>
                                                        {attempt.status === 'PUBLISHED'
                                                            ? 'Results published'
                                                            : 'Evaluation completed'}
                                                    </strong>
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}

                            <button
                                type="button"
                                disabled={
                                    publishing ||
                                    evaluations.length === 0 ||
                                    evaluations.some(
                                        attempt => attempt.status === 'PENDING_MANUAL_REVIEW'
                                    )
                                }
                                onClick={publishResults}
                            >
                                {publishing ? 'Publishing...' : 'Publish Results'}
                            </button>
                        </>
                    )}
                </section>
            </main>

            <footer className="examiner-footer">
                ExamEase | Resilient Online Examination System | Team 8
            </footer>
        </div>
    )
}

export default ExaminerDashboard
