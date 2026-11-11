
import { useState } from 'react'
import './Login.css'

import StudentDashboard from './StudentDashboard'
import ExaminerDashboard from './ExaminerDashboard'
import AdminDashboard from './AdminDashboard'

function getStoredUser() {
    const token = sessionStorage.getItem('examease_token')
    const storedUser = sessionStorage.getItem('examease_user')

    if (!token || !storedUser) return null

    try {
        const user = JSON.parse(storedUser)

        if (!user || !user.role) return null

        return user
    } catch {
        sessionStorage.removeItem('examease_token')
        sessionStorage.removeItem('examease_user')
        return null
    }
}

function Login() {
    const [registrationNumber, setRegistrationNumber] = useState('')
    const [password, setPassword] = useState('')

    const [userRole, setUserRole] = useState(
        () => getStoredUser()?.role || ''
    )

    const [isLoggedIn, setIsLoggedIn] = useState(
        () => Boolean(getStoredUser())
    )

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async (event) => {
        event.preventDefault()
        setError('')

        const rollNo = registrationNumber.trim()

        if (!rollNo || !password) {
            setError(
                'Please enter your registration number and password.'
            )
            return
        }

        try {
            setLoading(true)

            const response = await fetch(
                'http://localhost:5000/api/v1/auth/login',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        university_roll_no: rollNo,
                        password: password
                    })
                }
            )

            const data = await response.json()

            if (!response.ok || !data.success) {
                setError(
                    data.message || 'Invalid login credentials.'
                )
                return
            }

            if (!data.token || !data.user || !data.user.role) {
                setError(
                    'Invalid response received from server.'
                )
                return
            }

            // Normalize user details without losing original API fields.
            const loggedInUser = {
                ...data.user,

                name:
                    data.user.name ||
                    data.user.full_name ||
                    data.user.username ||
                    data.user.student_name ||
                    'Student',

                university_roll_no:
                    data.user.university_roll_no ||
                    data.user.registration_number ||
                    data.user.reg_no ||
                    data.user.register_number ||
                    data.user.usn ||
                    data.user.registrationNumber ||
                    rollNo
            }

            // Save authentication session.
            sessionStorage.setItem(
                'examease_token',
                data.token
            )

            sessionStorage.setItem(
                'examease_user',
                JSON.stringify(loggedInUser)
            )

            setUserRole(loggedInUser.role)
            setIsLoggedIn(true)

            setPassword('')
            setError('')

        } catch (error) {
            console.error('Login error:', error)

            setError(
                'Cannot connect to the server. Check whether the backend is running.'
            )
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        sessionStorage.removeItem('examease_token')
        sessionStorage.removeItem('examease_user')

        setRegistrationNumber('')
        setPassword('')
        setUserRole('')
        setIsLoggedIn(false)
        setError('')
    }

    if (isLoggedIn) {
        switch (userRole) {
            case 'STUDENT':
                return <StudentDashboard />

            case 'EXAMINER':
                return <ExaminerDashboard />

            case 'ADMIN':
                return <AdminDashboard />

            default:
                handleLogout()
                return null
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">

                <h1>Welcome Back</h1>

                <p>Sign in to your examination portal</p>

                <form onSubmit={handleLogin}>

                    <label htmlFor="registrationNumber">
                        University Registration Number
                    </label>

                    <input
                        id="registrationNumber"
                        type="text"
                        placeholder="Enter registration number"
                        value={registrationNumber}
                        onChange={(e) =>
                            setRegistrationNumber(e.target.value)
                        }
                        autoComplete="username"
                        required
                    />

                    <label htmlFor="password">
                        Password
                    </label>

                    <input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        autoComplete="current-password"
                        required
                    />

                    {error && (
                        <p className="login-error" role="alert">
                            {error}
                        </p>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>

                </form>

                <a
                    href="/"
                    onClick={(e) => {
                        e.preventDefault()
                        handleLogout()
                        window.location.reload()
                    }}
                >
                    Back to Home
                </a>

            </div>
        </div>
    )
}

export default Login
