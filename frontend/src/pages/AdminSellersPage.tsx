import { useEffect, useState } from 'react'
import {
  approveSeller,
  getCurrentUser,
  getPendingSellers,
  rejectSeller,
  type SellerApplication,
} from '../api/client'

type AccessStatus = 'checking' | 'allowed' | 'denied'

function AdminSellersPage() {
  const [access, setAccess] = useState<AccessStatus>('checking')
  const [applications, setApplications] = useState<SellerApplication[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser()
      .then((user) => setAccess(user.is_admin ? 'allowed' : 'denied'))
      .catch(() => setAccess('denied'))
  }, [])

  useEffect(() => {
    if (access !== 'allowed') return
    getPendingSellers()
      .then(setApplications)
      .catch(() => setError('Could not load applications'))
  }, [access])

  if (access === 'checking') return <p>Loading...</p>
  if (access === 'denied') return <p role="alert">You don't have permission to view this page.</p>

  async function handleApprove(id: number) {
    await approveSeller(id)
    setApplications((prev) => prev.filter((a) => a.id !== id))
  }

  async function handleReject(id: number) {
    const reason = window.prompt('Reason for rejection (optional):') ?? undefined
    await rejectSeller(id, reason)
    setApplications((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <main>
      <h1>Pending seller applications</h1>
      {error && <p role="alert">{error}</p>}
      {applications.length === 0 && <p>No pending applications.</p>}
      <ul>
        {applications.map((application) => (
          <li key={application.id}>
            {application.business_name}{' '}
            <button type="button" onClick={() => handleApprove(application.id)}>
              Approve
            </button>{' '}
            <button type="button" onClick={() => handleReject(application.id)}>
              Reject
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default AdminSellersPage
