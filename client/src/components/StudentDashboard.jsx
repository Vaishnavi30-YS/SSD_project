
import { useState, useEffect, useRef } from 'react'
import StudentExam from './StudentExam'
import './StudentDashboard.css'

const API_URL = 'http://localhost:5000/api/v1/exams'

function StudentDashboard() {
    const [exams, setExams] = useState([])
    const [results, setResults] = useState([])
    const [selectedExam, setSelectedExam] = useState(null)
    const [loading, setLoading] = useState(true)
    const [resultsLoading, setResultsLoading] = useState(true)
    const [error, setError] = useState('')
    const [resultsError, setResultsError] = useState('')
    const [profileOpen, setProfileOpen] = useState(false)

    const profileRef = useRef(null)

    const token = sessionStorage.getItem('examease_token')

    let user = {}

    try {
        user = JSON.parse(sessionStorage.getItem('examease_user') || '{}')
    } catch {
        user = {}
    }

    const studentName =
        user.name ||
        user.full_name ||
        user.username ||
        user.student_name ||
        'Student'

    const registrationNumber =
        user.registration_number ||
        user.reg_no ||
        user.register_number ||
        user.usn ||
        user.registrationNumber ||
        'Not available'

    const profileInitial = studentName.charAt(0).toUpperCase()

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                profileRef.current &&
                !profileRef.current.contains(event.target)
            ) {
                setProfileOpen(false)
            }
        }

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setProfileOpen(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        document.addEventListener('keydown', handleEscape)

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [])

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!token) {
                setError('Your login session has expired. Please log in again.')
                setLoading(false)
                setResultsLoading(false)
                return
            }

            try {
                const response = await fetch(`${API_URL}/available`, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.message || 'Unable to load examinations.')
                }

                const examList = Array.isArray(data)
                    ? data
                    : data.examinations || data.exams || data.data?.examinations || []

                setExams(examList.map(item => ({
                    id: item.exam_id ?? item.id,
                    name: item.title ?? item.name ?? 'Untitled Examination',
                    subject: item.subject ?? 'CSE',
                    date: item.scheduled_start
                        ? new Date(item.scheduled_start).toLocaleString()
                        : item.date ?? 'Not specified',
                    duration: `${item.duration_minutes ?? item.duration ?? 60} minutes`,
                    status: item.status ?? 'Upcoming'
                })))
            } catch (err) {
                setError(err.message || 'Could not load examinations.')
            } finally {
                setLoading(false)
            }

            try {
                const response = await fetch(`${API_URL}/results/mine`, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.message || 'Unable to load results.')
                }

                setResults(
                    Array.isArray(data)
                        ? data
                        : data.results || data.data?.results || []
                )
            } catch (err) {
                setResultsError(err.message || 'Could not load results.')
            } finally {
                setResultsLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    const handleLogout = () => {
        const confirmLogout = window.confirm(
            'Are you sure you want to log out?'
        )

        if (!confirmLogout) return

        sessionStorage.removeItem('examease_token')
        sessionStorage.removeItem('examease_user')

        setProfileOpen(false)

        // Reload App.jsx so its session check displays the landing/login page.
        window.location.reload()
    }

    if (selectedExam) {
        return <StudentExam exam={selectedExam} />
    }

    const completedCount = results.length

    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <h2>ExamEase</h2>

                <div className="student-profile" ref={profileRef}>
                    <button
                        type="button"
                        className="profile-trigger"
                        onClick={() => setProfileOpen(previous => !previous)}
                        aria-expanded={profileOpen}
                        aria-label="Open student profile menu"
                    >
                        <span>Student Portal</span>

                        <div className="profile-circle">
                            {profileInitial}
                        </div>

                        <span className="profile-arrow">
                            {profileOpen ? '▲' : '▼'}
                        </span>
                    </button>

                    {profileOpen && (
                        <div className="profile-dropdown">
                            <div className="profile-dropdown-header">
                                <div className="profile-circle dropdown-avatar">
                                    {profileInitial}
                                </div>

                                <div className="profile-user-info">
                                    <h3>{studentName}</h3>
                                    <p>Student</p>
                                </div>
                            </div>

                            <div className="profile-details">
                                <span>Registration Number</span>
                                <strong>{registrationNumber}</strong>
                            </div>

                            <div className="profile-details">
                                <span>Account Role</span>
                                <strong>Student</strong>
                            </div>

                            <div className="profile-divider"></div>

                            <button
                                type="button"
                                className="logout-button"
                                onClick={handleLogout}
                            >
                                <span>↪</span>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            <main className="dashboard-content">
                <section className="welcome-section">
                    <div>
                        <h1>Welcome, {studentName}!</h1>
                        <p>Manage your examinations from one place.</p>
                    </div>

                    <div className="welcome-icon">🎓</div>
                </section>

                <section className="dashboard-stats">
                    <div className="stat-card">
                        <h3>{exams.length}</h3>
                        <p>Available Exams</p>
                    </div>

                    <div className="stat-card">
                        <h3>{completedCount}</h3>
                        <p>Published Results</p>
                    </div>

                    <div className="stat-card">
                        <h3>{resultsLoading ? '...' : completedCount}</h3>
                        <p>Completed & Published</p>
                    </div>
                </section>

                <section className="exams-section">
                    <div className="section-heading">
                        <h2>Available Examinations</h2>
                        <span>Examinations from Database</span>
                    </div>

                    {loading && <p>Loading examinations...</p>}

                    {error && (
                        <p className="dashboard-error">{error}</p>
                    )}

                    {!loading && !error && exams.length === 0 && (
                        <p>No examinations are currently available.</p>
                    )}

                    {!loading && !error && exams.length > 0 && (
                        <div className="exam-list">
                            {exams.map(exam => (
                                <div className="exam-card" key={exam.id}>
                                    <div className="exam-details">
                                        <h3>{exam.name}</h3>
                                        <p>Subject: {exam.subject}</p>
                                        <p>Date: {exam.date}</p>
                                        <p>Duration: {exam.duration}</p>
                                    </div>

                                    <div className="exam-action">
                                        <span className="exam-status">
                                            {exam.status}
                                        </span>

                                        <button
                                            onClick={() => setSelectedExam(exam)}
                                        >
                                            View Instructions
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="exams-section results-section">
                    <div className="section-heading">
                        <h2>My Examination Results</h2>
                        <span>Published results</span>
                    </div>

                    {resultsLoading && <p>Loading results...</p>}

                    {resultsError && (
                        <p className="dashboard-error">{resultsError}</p>
                    )}

                    {!resultsLoading && !resultsError && results.length === 0 && (
                        <p>No published results are available yet.</p>
                    )}

                    {!resultsLoading && !resultsError && results.length > 0 && (
                        <div className="exam-list">
                            {results.map((result, index) => (
                                <div
                                    className="exam-card"
                                    key={result.attempt_id ?? index}
                                >
                                    <div className="exam-details">
                                        <h3>
                                            {result.title ||
                                                result.exam_title ||
                                                result.exam_name ||
                                                'Examination'}
                                        </h3>

                                        <p>
                                            Subject: {result.subject || 'CSE'}
                                        </p>

                                        <p>
                                            Marks: {result.total_marks ?? result.marks ?? 0}
                                        </p>

                                        <p>
                                            Status: {result.status || 'PUBLISHED'}
                                        </p>
                                    </div>

                                    <div className="exam-action">
                                        <span className="exam-status">
                                            Result Published
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="dashboard-note">
                    <h3>Important Reminder</h3>
                    <p>
                        Read the examination instructions before starting.
                        Keep your internet connection active during the exam.
                    </p>
                </section>
            </main>

            <footer className="dashboard-footer">
                ExamEase | Resilient Online Examination System | Team 8
            </footer>
        </div>
    )
}

export default StudentDashboard
