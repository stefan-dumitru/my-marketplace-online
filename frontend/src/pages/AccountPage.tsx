import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getCurrentUser, logout, type User } from '../api/client'

type Status = 'loading' | 'ready' | 'unauthenticated'

function AccountPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u)
        setStatus('ready')
      })
      .catch(() => setStatus('unauthenticated'))
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      void navigate('/login')
    }
  }, [status, navigate])

  if (status !== 'ready' || !user) return null

  return (
    <main>
      <h1>Account</h1>
      <p>Name: {user.full_name}</p>
      <p>Email: {user.email}</p>
      <button type="button" onClick={() => logout().then(() => navigate('/'))}>
        Log out
      </button>
    </main>
  )
}

export default AccountPage
