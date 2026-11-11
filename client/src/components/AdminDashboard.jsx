
import { useState, useEffect, useRef } from 'react'
import './AdminDashboard.css'

const API = 'http://localhost:5000/api/v1'

function AdminDashboard() {
    const [activeSection, setActiveSection] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [profileOpen, setProfileOpen] = useState(false)

    const profileRef = useRef(null)

    let user = {}

    try {
        user = JSON.parse(sessionStorage.getItem('examease_user') || '{}')
    } catch {
        user = {}
    }

    const adminName =
        user.name ||
        user.full_name ||
        user.username ||
        'Administrator'

    const adminId =
        user.university_roll_no ||
        user.registration_number ||
        user.reg_no ||
        user.admin_id ||
        user.employee_id ||
        'Not available'

    const profileInitial = adminName.charAt(0).toUpperCase()

    const [users, setUsers] = useState([])
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

    const token = sessionStorage.getItem('examease_token')

    const students = users.filter(user => user.role === 'STUDENT')
    const examiners = users.filter(user => user.role === 'EXAMINER')

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

    const handleLogout = () => {
        if (!window.confirm('Are you sure you want to log out?')) return

        sessionStorage.removeItem('examease_token')
        sessionStorage.removeItem('examease_user')

        window.location.reload()
    }

    // ==================================================
    // FETCH ALL STUDENTS AND EXAMINERS
    // ==================================================

    const fetchUsers = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        setError('')

        try {
            const response = await fetch(`${API}/users`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to retrieve accounts.')
            }

            setUsers(data.users || [])

        } catch (err) {
            console.error('User retrieval error:', err)
            setError(err.message || 'Cannot connect to the backend.')
        } finally {
            if (showLoading) setLoading(false)
        }
    }

    // ==================================================
    // FETCH COURSE ENROLMENTS
    // ==================================================

    const fetchCourseEnrolments = async (showLoading = true) => {
        if (showLoading) setLoading(true)

        try {
            const response = await fetch(`${API}/courses/enrolments`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to fetch enrolments.')
            }

            setCourseEnrolments(data.enrolments || [])

        } catch (err) {
            console.error('Course enrolment error:', err)
            setError(err.message || 'Cannot connect to the backend.')
        } finally {
            if (showLoading) setLoading(false)
        }
    }

    useEffect(() => {
        if (token) {
            fetchUsers(false)
            fetchCourseEnrolments(false)
        } else {
            setError('Your session has expired. Please log in again.')
        }
    }, [])

    // ==================================================
    // FORM HANDLERS
    // ==================================================

    const handleChange = event => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value
        })
    }

    const handleCourseChange = event => {
        setCourseForm({
            ...courseForm,
            [event.target.name]: event.target.value
        })
    }

    const resetForm = () => {
        setFormData({
            name: '',
            university_roll_no: '',
            email: '',
            password: ''
        })
    }

    const resetCourseForm = () => {
        setCourseForm({
            university_roll_no: '',
            course_name: '',
            subject_code: ''
        })
    }

    // ==================================================
    // OPEN MANAGEMENT SECTIONS
    // ==================================================

    const openSection = section => {
        setActiveSection(section)
        setMessage('')
        setError('')

        if (section === 'students' || section === 'faculty') {
            fetchUsers()
            resetForm()
        }
    }

    // ==================================================
    // CREATE STUDENT OR EXAMINER
    // ==================================================

    const handleCreateUser = async event => {
        event.preventDefault()

        setLoading(true)
        setMessage('')
        setError('')

        try {
            const role = activeSection === 'students'
                ? 'STUDENT'
                : 'EXAMINER'

            const response = await fetch(`${API}/users/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    role
                })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to create account.')
            }

            setMessage(data.message || 'Account created successfully!')
            resetForm()

            await fetchUsers(false)

        } catch (err) {
            console.error('Account creation error:', err)
            setError(err.message || 'Cannot connect to the backend.')
        } finally {
            setLoading(false)
        }
    }

    // ==================================================
    // AUDIT LOGS
    // ==================================================

    const handleViewAuditLogs = async () => {
        setActiveSection('audit')
        setLoading(true)
        setError('')
        setMessage('')
        setAuditLogs([])

        try {
            const response = await fetch(`${API}/users/audit-logs`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to retrieve audit logs.')
            }

            setAuditLogs(data.logs || [])

        } catch (err) {
            console.error('Audit logs error:', err)
            setError(err.message || 'Cannot connect to the backend.')
        } finally {
            setLoading(false)
        }
    }

    // ==================================================
    // COURSE ENROLMENTS
    // ==================================================

    const handleViewCourseEnrolments = () => {
        setActiveSection('courses')
        setMessage('')
        setError('')
        resetCourseForm()
        fetchCourseEnrolments()
    }

    const handleCreateEnrolment = async event => {
        event.preventDefault()

        setLoading(true)
        setMessage('')
        setError('')

        try {
            const response = await fetch(`${API}/courses/enrol`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(courseForm)
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to enrol student.')
            }

            setMessage(data.message || 'Student enrolled successfully!')
            resetCourseForm()

            await fetchCourseEnrolments(false)

        } catch (err) {
            console.error('Course enrolment error:', err)
            setError(err.message || 'Cannot connect to the backend.')
        } finally {
            setLoading(false)
        }
    }

    // ==================================================
    // BACK TO DASHBOARD
    // ==================================================

    const handleBackToDashboard = () => {
        setActiveSection('')
        setMessage('')
        setError('')
        resetForm()
        resetCourseForm()
        fetchUsers(false)
        fetchCourseEnrolments(false)
    }

    // ==================================================
    // USER TABLE
    // ==================================================

    const renderUserTable = (list, role) => (
        <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            {loading && <p>Loading accounts...</p>}

            {!loading && list.length === 0 && (
                <p>No {role.toLowerCase()} accounts found.</p>
            )}

            {!loading && list.length > 0 && (
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse'
                }}>
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Registration Number</th>
                            <th>Full Name</th>
                            <th>Email Address</th>
                            <th>Role</th>
                            <th>Created At</th>
                        </tr>
                    </thead>

                    <tbody>
                        {list.map(user => (
                            <tr key={user.user_id}>
                                <td>{user.user_id}</td>
                                <td>{user.university_roll_no}</td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.role}</td>
                                <td>
                                    {user.created_at
                                        ? new Date(user.created_at).toLocaleString()
                                        : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )

    // ==================================================
    // MAIN UI
    // ==================================================

    return (
        <div className="admin-dashboard">

            <nav className="admin-nav">
                <h2>ExamEase</h2>

                <div className="admin-profile" ref={profileRef}>
                    <button
                        type="button"
                        className="admin-profile-trigger"
                        onClick={() => setProfileOpen(previous => !previous)}
                        aria-expanded={profileOpen}
                    >
                        <span>Administrator Portal</span>

                        <div className="admin-profile-circle">
                            {profileInitial}
                        </div>

                        <span className="profile-arrow">
                            {profileOpen ? '▲' : '▼'}
                        </span>
                    </button>

                    {profileOpen && (
                        <div className="admin-profile-dropdown">
                            <div className="admin-profile-header">
                                <div className="admin-profile-circle dropdown-avatar">
                                    {profileInitial}
                                </div>

                                <div>
                                    <h3>{adminName}</h3>
                                    <p>Administrator</p>
                                </div>
                            </div>

                            <div className="admin-profile-details">
                                <span>Admin ID</span>
                                <strong>{adminId}</strong>
                            </div>

                            <div className="admin-profile-details">
                                <span>Account Role</span>
                                <strong>Admin</strong>
                            </div>

                            <div className="admin-profile-divider" />

                            <button
                                type="button"
                                className="admin-logout-button"
                                onClick={handleLogout}
                            >
                                ↪ Logout
                            </button>
                        </div>
                    )}
                </div>
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
                                <h3>{students.length}</h3>
                                <p>Total Students</p>
                            </div>

                            <div className="admin-stat-card">
                                <h3>{examiners.length}</h3>
                                <p>Total Examiners</p>
                            </div>

                            <div className="admin-stat-card">
                                <h3>{courseEnrolments.length}</h3>
                                <p>Course Enrolments</p>
                            </div>
                        </section>

                        {error && (
                            <p style={{ color: 'red' }}>{error}</p>
                        )}

                        <section className="admin-management">
                            <h2>System Management</h2>

                            <div className="admin-management-grid">

                                <div className="admin-management-card">
                                    <span>👨‍🎓</span>
                                    <h3>Student Management</h3>
                                    <p>
                                        Manage student credentials and account information.
                                    </p>
                                    <button onClick={() => openSection('students')}>
                                        Manage Students
                                    </button>
                                </div>

                                <div className="admin-management-card">
                                    <span>👨‍🏫</span>
                                    <h3>Faculty Management</h3>
                                    <p>
                                        Manage examiner credentials and faculty accounts.
                                    </p>
                                    <button onClick={() => openSection('faculty')}>
                                        Manage Faculty
                                    </button>
                                </div>

                                <div className="admin-management-card">
                                    <span>📚</span>
                                    <h3>Course Enrolments</h3>
                                    <p>
                                        Register students for courses and view enrolments.
                                    </p>
                                    <button onClick={handleViewCourseEnrolments}>
                                        Manage Enrolments
                                    </button>
                                </div>

                                <div className="admin-management-card">
                                    <span>📋</span>
                                    <h3>Audit Logs</h3>
                                    <p>
                                        Monitor and review important system activities.
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
                                Student and examiner accounts, course enrolments
                                and audit logs are connected to the backend.
                            </p>
                        </section>
                    </>

                ) : activeSection === 'students' || activeSection === 'faculty' ? (

                    <section className="admin-management">

                        <button type="button" onClick={handleBackToDashboard}>
                            ← Back to Dashboard
                        </button>

                        <h2>
                            {activeSection === 'students'
                                ? 'Student Management'
                                : 'Faculty Management'}
                        </h2>

                        <h3>
                            Create {activeSection === 'students'
                                ? 'Student'
                                : 'Examiner'} Account
                        </h3>

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

                            {error && <p style={{ color: 'red' }}>{error}</p>}
                            {message && <p style={{ color: 'green' }}>{message}</p>}

                            <button type="submit" disabled={loading}>
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>

                        <hr style={{ margin: '35px 0' }} />

                        <h3>
                            Existing {activeSection === 'students'
                                ? 'Students'
                                : 'Examiners'}
                            ({activeSection === 'students'
                                ? students.length
                                : examiners.length})
                        </h3>

                        <button
                            type="button"
                            onClick={() => fetchUsers()}
                            disabled={loading}
                        >
                            {loading ? 'Refreshing...' : 'Refresh Accounts'}
                        </button>

                        {error && <p style={{ color: 'red' }}>{error}</p>}

                        {renderUserTable(
                            activeSection === 'students' ? students : examiners,
                            activeSection === 'students' ? 'Student' : 'Examiner'
                        )}

                    </section>

                ) : activeSection === 'courses' ? (

                    <section className="admin-management">

                        <button type="button" onClick={handleBackToDashboard}>
                            ← Back to Dashboard
                        </button>

                        <h2>Course Enrolment Management</h2>
                        <p>
                            Enrol students in courses and view existing enrolments.
                        </p>

                        <h3>Enrol a Student</h3>

                        <form onSubmit={handleCreateEnrolment}>

                            <label>Student Registration Number</label>
                            <input
                                type="text"
                                name="university_roll_no"
                                value={courseForm.university_roll_no}
                                onChange={handleCourseChange}
                                placeholder="Enter registration number"
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

                            {error && <p style={{ color: 'red' }}>{error}</p>}
                            {message && <p style={{ color: 'green' }}>{message}</p>}

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
                                        {courseEnrolments.map(item => (
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
                            onClick={() => fetchCourseEnrolments()}
                            disabled={loading}
                            style={{ marginTop: '20px' }}
                        >
                            {loading ? 'Refreshing...' : 'Refresh Enrolments'}
                        </button>

                    </section>

                ) : activeSection === 'audit' ? (

                    <section className="admin-management">

                        <button type="button" onClick={handleBackToDashboard}>
                            ← Back to Dashboard
                        </button>

                        <h2>System Audit Logs</h2>
                        <p>Recent system activities (maximum 100 records).</p>

                        {loading && <p>Loading audit logs...</p>}
                        {error && <p style={{ color: 'red' }}>{error}</p>}

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
                                        {auditLogs.map(log => (
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

                ) : null}

            </main>

            <footer className="admin-footer">
                ExamEase | Resilient Online Examination System | Team 8
            </footer>

        </div>
    )
}

export default AdminDashboard
