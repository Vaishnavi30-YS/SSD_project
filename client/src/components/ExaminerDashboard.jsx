
import { useState } from 'react'
import './ExaminerDashboard.css'
import QuestionManagement from './QuestionManagement'

function ExaminerDashboard() {
    const [showForm, setShowForm] = useState(false)
    const [examinations, setExaminations] = useState([])

    const [examData, setExamData] = useState({
        title: '',
        subject: '',
        duration: '',
        date: '',
        deliveryMode: ''
    })

    const handleChange = (e) => {
        setExamData({
            ...examData,
            [e.target.name]: e.target.value
        })
    }

    const handleCreateExam = (e) => {
        e.preventDefault()

        const newExam = {
            id: Date.now(),
            ...examData
        }

        setExaminations((prev) => [...prev, newExam])

        setExamData({
            title: '',
            subject: '',
            duration: '',
            date: '',
            deliveryMode: ''
        })

        setShowForm(false)
    }

    return (
        <div className="examiner-dashboard">

            {/* Navigation Bar */}
            <nav className="examiner-nav">
                <h2>ExamEase</h2>
                <span>Examiner Portal</span>
            </nav>

            <main className="examiner-content">

                {/* Welcome Section */}
                <section className="examiner-welcome">
                    <div>
                        <h1>Welcome, Examiner!</h1>
                        <p>
                            Manage examinations, questions and student evaluations.
                        </p>
                    </div>

                    <span className="examiner-icon">👨‍🏫</span>
                </section>

                {/* Statistics */}
                <section className="examiner-stats">

                    <div className="examiner-stat-card">
                        <h3>{examinations.length}</h3>
                        <p>Total Examinations</p>
                    </div>

                    <div className="examiner-stat-card">
                        <h3>0</h3>
                        <p>Pending Evaluations</p>
                    </div>

                    <div className="examiner-stat-card">
                        <h3>0</h3>
                        <p>Published Results</p>
                    </div>

                </section>

                {/* Examination Management */}
                <section className="examiner-actions">

                    <div className="examiner-section-heading">
                        <h2>Examination Management</h2>

                        <button onClick={() => setShowForm(!showForm)}>
                            {showForm
                                ? 'Close Form'
                                : '+ Create Examination'}
                        </button>
                    </div>

                    {/* Create Examination Form */}
                    {showForm && (
                        <form
                            className="create-exam-form"
                            onSubmit={handleCreateExam}
                        >

                            <h3>Create New Examination</h3>

                            <label>Examination Title</label>
                            <input
                                type="text"
                                name="title"
                                placeholder="Enter examination title"
                                value={examData.title}
                                onChange={handleChange}
                                required
                            />

                            <label>Course / Subject</label>
                            <input
                                type="text"
                                name="subject"
                                placeholder="Enter course name"
                                value={examData.subject}
                                onChange={handleChange}
                                required
                            />

                            <label>Duration (minutes)</label>
                            <input
                                type="number"
                                name="duration"
                                min="1"
                                placeholder="Example: 60"
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
                                <option value="">
                                    Select delivery mode
                                </option>

                                <option value="FREE_NAVIGATION">
                                    All Questions at Once
                                </option>

                                <option value="SEQUENTIAL_ONE_BY_ONE">
                                    One Question at a Time
                                </option>
                            </select>

                            <button type="submit">
                                Save Examination
                            </button>

                        </form>
                    )}

                    {/* Created Examinations */}
                    <div className="created-exams">

                        <h3>Created Examinations</h3>

                        {examinations.length === 0 ? (

                            <div className="examiner-empty-state">
                                <div>📋</div>

                                <h3>No Examinations Created Yet</h3>

                                <p>
                                    Create an examination to start managing
                                    questions and assessments.
                                </p>
                            </div>

                        ) : (

                            examinations.map((exam) => (
                                <div
                                    className="created-exam-card"
                                    key={exam.id}
                                >
                                    <h3>{exam.title}</h3>

                                    <p>
                                        Subject: {exam.subject}
                                    </p>

                                    <p>
                                        Duration: {exam.duration} minutes
                                    </p>

                                    <p>
                                        Date: {new Date(exam.date).toLocaleString()}
                                    </p>

                                    <p>
                                        Mode: {
                                            exam.deliveryMode === 'FREE_NAVIGATION'
                                                ? 'All Questions at Once'
                                                : 'One Question at a Time'
                                        }
                                    </p>
                                </div>
                            ))

                        )}

                    </div>

                </section>

                {/* Question Management */}
                <QuestionManagement examinations={examinations} />

                {/* Evaluation Management */}
                <section className="evaluation-section">
                    <h2>Evaluation Management</h2>

                    <p>
                        Descriptive answers will appear here for manual
                        evaluation after students submit their examinations.
                    </p>
                </section>

            </main>

            {/* Footer */}
            <footer className="examiner-footer">
                ExamEase | Resilient Online Examination System | Team 8
            </footer>

        </div>
    )
}

export default ExaminerDashboard

