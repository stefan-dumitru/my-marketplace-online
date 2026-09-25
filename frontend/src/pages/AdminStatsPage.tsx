import { useEffect, useState } from 'react'
import { getAdminStats, getCurrentUser, type AdminStats } from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

  if (access === 'checking') return <p className="text-muted-foreground">Loading...</p>
  if (access === 'denied')
    return (
      <Alert variant="destructive">
        <AlertDescription>You don't have permission to view this page.</AlertDescription>
      </Alert>
    )
  if (!stats) return <p className="text-muted-foreground">Loading stats...</p>

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Platform stats</h1>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total sellers: {stats.total_sellers}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
              {Object.entries(stats.sellers_by_status).map(([status, count]) => (
                <li key={status}>
                  {status}: {count}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total products: {stats.total_products}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total orders: {stats.total_orders}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
              {Object.entries(stats.orders_by_status).map(([status, count]) => (
                <li key={status}>
                  {status}: {count}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total revenue: {stats.total_revenue} lei</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </main>
  )
}

export default AdminStatsPage
