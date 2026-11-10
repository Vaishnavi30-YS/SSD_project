
import { useState } from 'react'
import StudentExam from './StudentExam'
import './StudentDashboard.css'

const exams = [
    {
        id: 1,
        name: 'Data Structures',
        subject: 'CSE',
        date: '18 November 2026',
        duration: '60 minutes',
        status: 'Upcoming',
    },
    {
        id: 2,
        name: 'Database Management Systems',
        subject: 'CSE',
        date: '22 November 2026',
        duration: '90 minutes',
        status: 'Upcoming',
    },
    {
        id: 3,
        name: 'Operating Systems',
        subject: 'CSE',
        date: '25 November 2026',
        duration: '60 minutes',
        status: 'Upcoming',
    },
]

function StudentDashboard() {
    const [selectedExam, setSelectedExam] = useState(null)

    if (selectedExam) {
        return <StudentExam exam={selectedExam} />
    }

    return (
        <div className="dashboard">

            {/* Navigation Bar */}
            <nav className="dashboard-nav">
                <h2>ExamEase</h2>

                <div className="student-profile">
                    <span>Student Portal</span>
                    <div className="profile-circle">S</div>
                </div>
            </nav>

            <main className="dashboard-content">

                {/* Welcome Section */}
                <section className="welcome-section">
                    <div>
                        <h1>Welcome, Student!</h1>
                        <p>Manage your examinations from one place.</p>
                    </div>

                    <div className="welcome-icon">🎓</div>
                </section>

                {/* Dashboard Statistics */}
                <section className="dashboard-stats">

                    <div className="stat-card">
                        <h3>{exams.length}</h3>
                        <p>Upcoming Exams</p>
                    </div>

                    <div className="stat-card">
                        <h3>0</h3>
                        <p>Completed Exams</p>
                    </div>

                    <div className="stat-card">
                        <h3>0</h3>
                        <p>Published Results</p>
                    </div>

                </section>

                {/* Upcoming Examinations */}
                <section className="exams-section">

                    <div className="section-heading">
                        <h2>Upcoming Examinations</h2>
                        <span>Scheduled Exams</span>
                    </div>

                    <div className="exam-list">

                        {exams.map((exam) => (

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
                </section>

                {/* Important Reminder */}
                <section className="dashboard-note">
                    <h3>Important Reminder</h3>

                    <p>
                        Please read the examination instructions before starting
                        an exam. Your answers will be saved locally and synchronized
                        with the server when connectivity is available.
                    </p>
                </section>

            </main>

            {/* Footer */}
            <footer className="dashboard-footer">
                ExamEase | Resilient Online Examination System | Team 8
            </footer>

        </div>
    )
}

export default StudentDashboard
