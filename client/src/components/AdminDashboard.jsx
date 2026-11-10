
import { useState } from 'react'
import './AdminDashboard.css'

function AdminDashboard() {
    const [activeSection, setActiveSection] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [auditLogs, setAuditLogs] = useState([])
    const [courseEnrolments, setCourseEnrolments] = useState([])

    const [formData, setFormData] = useState({
        name: '',
        university_roll_no: '',
        email: '',
        password: ''
    })

    const [courseForm, setCourseForm] = useState({
        university_roll_no: '',
        course_name: '',
        subject_code: ''
    })

    const resetForm = () => {
        setFormData({
            name: '',
            university_roll_no: '',
            email: '',
            password: ''
        })

        setMessage('')
        setError('')
    }

    const resetCourseForm = () => {
        setCourseForm({
            university_roll_no: '',
            course_name: '',
            subject_code: ''
        })
    }

    const openSection = (section) => {
        resetForm()
        setActiveSection(section)
    }

    const handleChange = (event) => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value
        })
    }

    const handleCourseChange = (event) => {
        setCourseForm({
            ...courseForm,
            [event.target.name]: event.target.value
        })
    }

    // Create student or examiner account
    const handleCreateUser = async (event) => {
        event.preventDefault()
        setLoading(true)
        setMessage('')
        setError('')

        try {
            const token = sessionStorage.getItem('examease_token')

            const role = activeSection === 'students'
                ? 'STUDENT'
                : 'EXAMINER'

            const response = await fetch(
                'http://localhost:5000/api/v1/users/create',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ...formData,
                        role
                    })
                }
            )

            const data = await response.json()

            if (!response.ok || !data.success) {
                setError(data.message || 'Unable to create account.')
                return
            }

            setMessage(data.message || 'Account created successfully!')

            setFormData({
                name: '',
                university_roll_no: '',
                email: '',
                password: ''
            })

        } catch (err) {
            console.error('User creation error:', err)
            setError('Cannot connect to the backend server.')
        } finally {
            setLoading(false)
        }
    }

    // Fetch audit logs
    const handleViewAuditLogs = async () => {
        setActiveSection('audit')
        setLoading(true)
        setError('')
        setAuditLogs([])

        try {
            const token = sessionStorage.getItem('examease_token')

            const response = await fetch(
                'http://localhost:5000/api/v1/users/audit-logs',
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            )

            const data = await response.json()

            if (!response.ok || !data.success) {
                setError(data.message || 'Unable to retrieve audit logs.')
                return
            }

            setAuditLogs(data.logs || [])

        } catch (err) {
            console.error('Audit logs error:', err)
            setError('Cannot connect to the backend server.')
        } finally {
            setLoading(false)
        }
    }

    // Fetch course enrolments
    const fetchCourseEnrolments = async () => {
        setLoading(true)
        setError('')

        try {
            const token = sessionStorage.getItem('examease_token')

            const response = await fetch(
                'http://localhost:5000/api/v1/courses/enrolments',
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            )

            const data = await response.json()

            if (!response.ok || !data.success) {
                setError(data.message || 'Unable to fetch course enrolments.')
                return
            }

            setCourseEnrolments(data.enrolments || [])

        } catch (err) {
            console.error('Course enrolment fetch error:', err)
            setError('Cannot connect to the backend server.')
        } finally {
            setLoading(false)
        }
    }

    // Open course enrolment section
    const handleViewCourseEnrolments = () => {
        setActiveSection('courses')
        setMessage('')
        setCourseEnrolments([])
        resetCourseForm()
        fetchCourseEnrolments()
    }

    // Enrol a student in a course
    const handleCreateEnrolment = async (event) => {
        event.preventDefault()
        setLoading(true)
        setMessage('')
        setError('')

        try {
            const token = sessionStorage.getItem('examease_token')

            const response = await fetch(
                'http://localhost:5000/api/v1/courses/enrol',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(courseForm)
                }
            )

            const data = await response.json()

            if (!response.ok || !data.success) {
                setError(data.message || 'Unable to enrol student.')
                return
            }

            setMessage(data.message || 'Student enrolled successfully!')
            resetCourseForm()

            await fetchCourseEnrolments()

        } catch (err) {
            console.error('Course enrolment error:', err)
            setError('Cannot connect to the backend server.')
        } finally {
            setLoading(false)
        }
    }

    const handleBackToDashboard = () => {
        setActiveSection('')
        resetForm()
        resetCourseForm()
        setAuditLogs([])
        setCourseEnrolments([])
        setMessage('')
        setError('')
    }

    return (
        <div className="admin-dashboard">

            <nav className="admin-nav">
                <h2>ExamEase</h2>
                <span>Administrator Portal</span>
            </nav>

            <main className="admin-content">

                {!activeSection ? (
                    <>
                        <section className="admin-welcome">
                            <div>
                                <h1>Welcome, Administrator!</h1>
                                <p>
                                    Manage users, course enrolments and
                                    system activities.
                                </p>
                            </div>
                            <span className="admin-icon">⚙️</span>
                        </section>

                        <section className="admin-stats">
                            <div className="admin-stat-card">
                                <h3>0</h3>
                                <p>Total Students</p>
                            </div>

                            <div className="admin-stat-card">
                                <h3>0</h3>
                                <p>Total Examiners</p>
                            </div>

                            <div className="admin-stat-card">
                                <h3>{courseEnrolments.length}</h3>
                                <p>Course Enrolments</p>
                            </div>
                        </section>

                        <section className="admin-management">
                            <h2>System Management</h2>

                            <div className="admin-management-grid">

                                <div className="admin-management-card">
                                    <span>👨‍🎓</span>
                                    <h3>Student Management</h3>
                                    <p>
                                        Manage student credentials and
                                        account information.
                                    </p>
                                    <button onClick={() => openSection('students')}>
                                        Manage Students
                                    </button>
                                </div>

                                <div className="admin-management-card">
                                    <span>👨‍🏫</span>
                                    <h3>Faculty Management</h3>
                                    <p>
                                        Manage examiner credentials and
                                        faculty accounts.
                                    </p>
                                    <button onClick={() => openSection('faculty')}>
                                        Manage Faculty
                                    </button>
                                </div>

                                <div className="admin-management-card">
                                    <span>📚</span>
                                    <h3>Course Enrolments</h3>
                                    <p>
                                        Register students for courses and
                                        view their enrolment details.
                                    </p>
                                    <button onClick={handleViewCourseEnrolments}>
                                        Manage Enrolments
                                    </button>
                                </div>

                                <div className="admin-management-card">
                                    <span>📋</span>
                                    <h3>Audit Logs</h3>
                                    <p>
                                        Monitor and review important
                                        system activities.
                                    </p>
                                    <button onClick={handleViewAuditLogs}>
                                        View Audit Logs
                                    </button>
                                </div>

                            </div>
                        </section>

                        <section className="admin-note">
                            <h3>System Administration</h3>
                            <p>
                                Student and examiner account creation,
                                audit logs and course enrolments are
                                connected to the backend.
                            </p>
                        </section>
                    </>
                ) : activeSection === 'audit' ? (
                    <section className="admin-management">

                        <button type="button" onClick={handleBackToDashboard}>
                            ← Back to Dashboard
                        </button>

                        <h2>System Audit Logs</h2>
                        <p>Recent system activities (maximum 100 records).</p>

                        {loading && <p>Loading audit logs...</p>}

                        {error && (
                            <p style={{ color: 'red' }}>{error}</p>
                        )}

                        {!loading && !error && auditLogs.length === 0 && (
                            <p>No audit records found.</p>
                        )}

                        {!loading && auditLogs.length > 0 && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    marginTop: '20px'
                                }}>
                                    <thead>
                                        <tr>
                                            <th>Log ID</th>
                                            <th>User</th>
                                            <th>Registration No.</th>
                                            <th>Role</th>
                                            <th>Action</th>
                                            <th>Details</th>
                                            <th>Date & Time</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {auditLogs.map((log) => (
                                            <tr key={log.log_id}>
                                                <td>{log.log_id}</td>
                                                <td>{log.user_name || 'Unknown'}</td>
                                                <td>{log.university_roll_no || '-'}</td>
                                                <td>{log.user_role || '-'}</td>
                                                <td>{log.action}</td>
                                                <td>{log.details || '-'}</td>
                                                <td>
                                                    {log.created_at
                                                        ? new Date(log.created_at).toLocaleString()
                                                        : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleViewAuditLogs}
                            disabled={loading}
                            style={{ marginTop: '20px' }}
                        >
                            {loading ? 'Refreshing...' : 'Refresh Logs'}
                        </button>

                    </section>
                ) : activeSection === 'courses' ? (
                    <section className="admin-management">

                        <button type="button" onClick={handleBackToDashboard}>
                            ← Back to Dashboard
                        </button>

                        <h2>Course Enrolment Management</h2>
                        <p>Enrol students in courses and view existing enrolments.</p>

                        <h3>Enrol a Student</h3>

                        <form onSubmit={handleCreateEnrolment}>

                            <label>Student Registration Number</label>
                            <input
                                type="text"
                                name="university_roll_no"
                                value={courseForm.university_roll_no}
                                onChange={handleCourseChange}
                                placeholder="Enter student registration number"
                                required
                            />

                            <label>Course Name</label>
                            <input
                                type="text"
                                name="course_name"
                                value={courseForm.course_name}
                                onChange={handleCourseChange}
                                placeholder="Enter course name"
                                required
                            />

                            <label>Subject Code</label>
                            <input
                                type="text"
                                name="subject_code"
                                value={courseForm.subject_code}
                                onChange={handleCourseChange}
                                placeholder="Enter subject code"
                            />

                            {error && (
                                <p style={{ color: 'red' }}>{error}</p>
                            )}

                            {message && (
                                <p style={{ color: 'green' }}>{message}</p>
                            )}

                            <button type="submit" disabled={loading}>
                                {loading ? 'Processing...' : 'Enrol Student'}
                            </button>

                        </form>

                        <h3 style={{ marginTop: '35px' }}>
                            Existing Course Enrolments
                        </h3>

                        {loading && <p>Loading enrolments...</p>}

                        {!loading && courseEnrolments.length === 0 && !error && (
                            <p>No course enrolments found.</p>
                        )}

                        {courseEnrolments.length > 0 && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    marginTop: '15px'
                                }}>
                                    <thead>
                                        <tr>
                                            <th>Enrolment ID</th>
                                            <th>Student Name</th>
                                            <th>Registration Number</th>
                                            <th>Course Name</th>
                                            <th>Subject Code</th>
                                            <th>Enrolled At</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {courseEnrolments.map((item) => (
                                            <tr key={item.enrolment_id}>
                                                <td>{item.enrolment_id}</td>
                                                <td>{item.student_name}</td>
                                                <td>{item.university_roll_no}</td>
                                                <td>{item.course_name}</td>
                                                <td>{item.subject_code || '-'}</td>
                                                <td>
                                                    {item.enrolled_at
                                                        ? new Date(item.enrolled_at).toLocaleString()
                                                        : '-'}
                                                </td>
                                                <td>{item.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={fetchCourseEnrolments}
                            disabled={loading}
                            style={{ marginTop: '20px' }}
                        >
                            {loading ? 'Refreshing...' : 'Refresh Enrolments'}
                        </button>

                    </section>
                ) : (
                    <section className="admin-management">

                        <button
                            type="button"
                            onClick={handleBackToDashboard}
                        >
                            ← Back to Dashboard
                        </button>

                        <h2>
                            {activeSection === 'students'
                                ? 'Create Student Account'
                                : 'Create Examiner Account'}
                        </h2>

                        <form onSubmit={handleCreateUser}>

                            <label>Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter full name"
                                required
                            />

                            <label>University Registration Number</label>
                            <input
                                type="text"
                                name="university_roll_no"
                                value={formData.university_roll_no}
                                onChange={handleChange}
                                placeholder="Enter registration number"
                                required
                            />

                            <label>Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter email address"
                                required
                            />

                            <label>Password (minimum 8 characters)</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Create password"
                                minLength={8}
                                required
                            />

                            {error && (
                                <p style={{ color: 'red' }}>{error}</p>
                            )}

                            {message && (
                                <p style={{ color: 'green' }}>{message}</p>
                            )}

                            <button type="submit" disabled={loading}>
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>

                        </form>
                    </section>
                )}

            </main>

            <footer className="admin-footer">
                ExamEase | Resilient Online Examination System | Team 8
            </footer>

        </div>
    )
}

export default AdminDashboard
