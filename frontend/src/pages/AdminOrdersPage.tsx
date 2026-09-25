import { useEffect, useState } from 'react'
import { getAdminOrders, getCurrentUser, type OrderListItem } from '../api/client'

type AccessStatus = 'checking' | 'allowed' | 'denied'

function AdminOrdersPage() {
  const [access, setAccess] = useState<AccessStatus>('checking')
  const [orders, setOrders] = useState<OrderListItem[] | null>(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser()
      .then((user) => setAccess(user.is_admin ? 'allowed' : 'denied'))
      .catch(() => setAccess('denied'))
  }, [])

  useEffect(() => {
    if (access !== 'allowed') return
    getAdminOrders(filter || undefined)
      .then((page) => setOrders(page.items))
      .catch(() => setError('Could not load orders'))
  }, [access, filter])

  if (access === 'checking') return <p>Loading...</p>
  if (access === 'denied') return <p role="alert">You don't have permission to view this page.</p>

  return (
    <main>
      <h1>All orders</h1>

      <label htmlFor="statusFilter">Filter by status</label>
      <select id="statusFilter" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="">All</option>
        <option value="placed">Placed</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {error && <p role="alert">{error}</p>}
      {orders === null && <p>Loading orders...</p>}
      {orders !== null && orders.length === 0 && <p>No orders match this filter.</p>}
      <ul>
        {(orders ?? []).map((order) => (
          <li key={order.id}>
            Order #{order.id} — {order.seller_business_name} · {order.total_amount} lei ·{' '}
            {order.status}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default AdminOrdersPage
