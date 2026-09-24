import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getHealth, getCurrentUser, logout, type HealthStatus, type User } from '../api/client'

function AuthStatus() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  if (user) {
    return (
      <p>
        Logged in as {user.email} ·{' '}
        <button type="button" onClick={() => logout().then(() => setUser(null))}>
          Log out
        </button>
      </p>
    )
  }

  return (
    <p>
      <Link to="/login">Log in</Link> · <Link to="/signup">Sign up</Link>
    </p>
  )
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setError('Could not reach the backend'))
  }, [])

  return (
    <main>
      <h1>Marketplace</h1>
      <AuthStatus />
      {error && <p role="alert">{error}</p>}
      {!error && !health && <p>Checking backend status...</p>}
      {health && (
        <p>
          Backend status: <strong>{health.status}</strong> · Database: <strong>{health.db}</strong>
        </p>
      )}
    </main>
  )
}

export default App
