
import { useState } from 'react'
import Login from './components/Login'
import './App.css'

function hasActiveSession() {
  const token = sessionStorage.getItem('examease_token')
  const user = sessionStorage.getItem('examease_user')

  if (!token || !user) return false

  try {
    const parsedUser = JSON.parse(user)
    return Boolean(parsedUser && parsedUser.role)
  } catch {
    sessionStorage.removeItem('examease_token')
    sessionStorage.removeItem('examease_user')
    return false
  }
}

function App() {
  const [showLogin, setShowLogin] = useState(hasActiveSession)

  if (showLogin) {
    return <Login />
  }

  return (
    <div className="app">
      <nav className="navbar">
        <h2>
          Exam<span>Ease</span>
        </h2>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>

          <button
            className="login-btn"
            onClick={() => setShowLogin(true)}
          >
            Login
          </button>
        </div>
      </nav>

      <main className="hero" id="home">
        <div className="hero-content">
          <p className="tagline">
            RESILIENT ONLINE EXAMINATION SYSTEM
          </p>

          <h1>
            Examinations made
            <span> smarter and reliable.</span>
          </h1>

          <p className="description">
            A secure online examination platform designed to keep your
            answers safe, even when your internet connection is interrupted.
          </p>

          <button
            className="start-btn"
            onClick={() => setShowLogin(true)}
          >
            Explore Platform →
          </button>
        </div>

        <div className="hero-card">
          <div className="card-icon">📚</div>

          <h3>Examination Portal</h3>

          <p>Your examinations, all in one place.</p>

          <div className="status">
            <span className="status-dot"></span>
            System Ready
          </div>

          <div className="stats">
            <div>
              <h2>24/7</h2>
              <p>Accessibility</p>
            </div>

            <div>
              <h2>100%</h2>
              <p>Local Saving</p>
            </div>
          </div>
        </div>
      </main>

      <section className="features" id="features">
        <h2>Designed for Reliable Examinations</h2>

        <div className="feature-grid">
          <div className="feature-card">
            <h3>🔒 Secure Access</h3>
            <p>
              Role-based access for students, examiners and administrators.
            </p>
          </div>

          <div className="feature-card">
            <h3>💾 Smart Autosave</h3>
            <p>
              Answers are saved locally and synchronized with the server.
            </p>
          </div>

          <div className="feature-card">
            <h3>📡 Offline Support</h3>
            <p>
              Continue working during temporary internet interruptions.
            </p>
          </div>
        </div>
      </section>

      <footer>
        <p>
          ExamEase | Resilient Online Examination System | Team 8
        </p>
      </footer>
    </div>
  )
}

export default App
