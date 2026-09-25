import { useEffect, useState } from 'react'
import { getAdminStats, getCurrentUser, type AdminStats } from '../api/client'
import AdminNav from './AdminNav'

type AccessStatus = 'checking' | 'allowed' | 'denied'

function AdminStatsPage() {
  const [access, setAccess] = useState<AccessStatus>('checking')
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    getCurrentUser()
      .then((user) => setAccess(user.is_admin ? 'allowed' : 'denied'))
      .catch(() => setAccess('denied'))
  }, [])

  useEffect(() => {
    if (access === 'allowed') getAdminStats().then(setStats)
  }, [access])

  if (access === 'checking') return <p>Loading...</p>
  if (access === 'denied') return <p role="alert">You don't have permission to view this page.</p>
  if (!stats) return <p>Loading stats...</p>

  return (
    <main>
      <h1>Platform stats</h1>
      <AdminNav />
      <p>Total sellers: {stats.total_sellers}</p>
      <ul>
        {Object.entries(stats.sellers_by_status).map(([status, count]) => (
          <li key={status}>
            {status}: {count}
          </li>
        ))}
      </ul>
      <p>Total products: {stats.total_products}</p>
      <p>Total orders: {stats.total_orders}</p>
      <p>Total revenue: {stats.total_revenue} lei</p>
      <ul>
        {Object.entries(stats.orders_by_status).map(([status, count]) => (
          <li key={status}>
            {status}: {count}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default AdminStatsPage
