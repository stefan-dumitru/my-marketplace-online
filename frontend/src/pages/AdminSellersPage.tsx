import { useEffect, useState } from 'react'
import {
  approveSeller,
  getAllSellers,
  getCurrentUser,
  reinstateSeller,
  rejectSeller,
  suspendSeller,
  type SellerApplication,
} from '../api/client'
import AdminNav from './AdminNav'

type AccessStatus = 'checking' | 'allowed' | 'denied'

function AdminSellersPage() {
  const [access, setAccess] = useState<AccessStatus>('checking')
  const [sellers, setSellers] = useState<SellerApplication[]>([])
  const [error, setError] = useState<string | null>(null)

  function reload() {
    getAllSellers()
      .then(setSellers)
      .catch(() => setError('Could not load sellers'))
  }

  useEffect(() => {
    getCurrentUser()
      .then((user) => setAccess(user.is_admin ? 'allowed' : 'denied'))
      .catch(() => setAccess('denied'))
  }, [])

  useEffect(() => {
    if (access === 'allowed') reload()
  }, [access])

  if (access === 'checking') return <p>Loading...</p>
  if (access === 'denied') return <p role="alert">You don't have permission to view this page.</p>

  async function handleApprove(id: number) {
    await approveSeller(id)
    reload()
  }

  async function handleReject(id: number) {
    const reason = window.prompt('Reason for rejection (optional):') ?? undefined
    await rejectSeller(id, reason)
    reload()
  }

  async function handleSuspend(id: number) {
    const reason = window.prompt('Reason for suspension (optional):') ?? undefined
    await suspendSeller(id, reason)
    reload()
  }

  async function handleReinstate(id: number) {
    await reinstateSeller(id)
    reload()
  }

  return (
    <main>
      <h1>Sellers</h1>
      <AdminNav />
      {error && <p role="alert">{error}</p>}
      {sellers.length === 0 && <p>No sellers yet.</p>}
      <ul>
        {sellers.map((seller) => (
          <li key={seller.id}>
            {seller.business_name} — {seller.status}{' '}
            {seller.status === 'pending' && (
              <>
                <button type="button" onClick={() => handleApprove(seller.id)}>
                  Approve
                </button>{' '}
                <button type="button" onClick={() => handleReject(seller.id)}>
                  Reject
                </button>
              </>
            )}
            {seller.status === 'approved' && (
              <button type="button" onClick={() => handleSuspend(seller.id)}>
                Suspend
              </button>
            )}
            {seller.status === 'suspended' && (
              <button type="button" onClick={() => handleReinstate(seller.id)}>
                Reinstate
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default AdminSellersPage
