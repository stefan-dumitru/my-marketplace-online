import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  getHealth,
  getCurrentUser,
  getMyApplication,
  logout,
  type HealthStatus,
  type SellerStatus,
  type User,
} from '../api/client'

function SellerLink({ isAdmin }: { isAdmin: boolean }) {
  const [status, setStatus] = useState<SellerStatus | 'none' | null>(null)

  useEffect(() => {
    if (isAdmin) return
    getMyApplication()
      .then((app) => setStatus(app.status))
      .catch(() => setStatus('none'))
  }, [isAdmin])

  if (isAdmin) {
    return <Link to="/admin/sellers">Seller applications</Link>
  }
  if (status === 'approved') {
    return <Link to="/sell">Seller dashboard</Link>
  }
  if (status === null) return null
  return <Link to="/sell/apply">Become a seller</Link>
}

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
        Logged in as {user.email} · <Link to="/cart">Cart</Link> · <Link to="/orders">Orders</Link>{' '}
        · <SellerLink isAdmin={user.is_admin} /> ·{' '}
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
      <p>
        <Link to="/catalog">Browse catalog</Link>
      </p>
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
