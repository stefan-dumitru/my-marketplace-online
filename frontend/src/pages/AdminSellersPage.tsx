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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

  if (access === 'checking') return <p className="text-muted-foreground">Loading...</p>
  if (access === 'denied')
    return (
      <Alert variant="destructive">
        <AlertDescription>You don't have permission to view this page.</AlertDescription>
      </Alert>
    )

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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Sellers</h1>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {sellers.length === 0 && <p className="text-muted-foreground">No sellers yet.</p>}
      {sellers.length > 0 && (
        <ul className="flex flex-col gap-3">
          {sellers.map((seller) => (
            <li key={seller.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    {seller.business_name} — {seller.status}
                  </span>
                  <span className="flex gap-2">
                    {seller.status === 'pending' && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(seller.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(seller.id)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {seller.status === 'approved' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuspend(seller.id)}
                      >
                        Suspend
                      </Button>
                    )}
                    {seller.status === 'suspended' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleReinstate(seller.id)}
                      >
                        Reinstate
                      </Button>
                    )}
                  </span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default AdminSellersPage
