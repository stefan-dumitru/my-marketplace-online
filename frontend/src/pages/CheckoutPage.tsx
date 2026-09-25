import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { checkout, getAddresses, ApiError, type Address, type CheckoutResult } from '../api/client'
import AddressForm from '../components/AddressForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

const selectClassName =
  'border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

function CheckoutPage() {
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getAddresses().then((list) => {
      setAddresses(list)
      const preferred = list.find((address) => address.is_default) ?? list[0]
      if (preferred) setSelectedId(preferred.id)
    })
  }, [])

  async function handleCheckout() {
    if (selectedId === null) return
    setError(null)
    setSubmitting(true)
    try {
      const checkoutResult = await checkout(selectedId)
      setResult(checkoutResult)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <main className="mx-auto w-full max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Order placed</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {result.order_ids.length > 0 && (
              <p>
                Created {result.order_ids.length} order(s): {result.order_ids.join(', ')}
              </p>
            )}
            {result.skipped.length > 0 && (
              <div>
                <p className="mb-2">Some items couldn't be ordered:</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {result.skipped.map((item) => (
                    <li key={item.product_id}>
                      {item.product_name} — {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link to="/orders" className="text-sm underline underline-offset-4">
              View your orders
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (addresses === null) return <p className="text-muted-foreground">Loading...</p>

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>

      <Card>
        <CardContent className="flex flex-col gap-6">
          {addresses.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="shippingAddress">Shipping address</Label>
              <select
                id="shippingAddress"
                className={selectClassName}
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(Number(e.target.value))}
              >
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label} — {address.street}, {address.city}
                  </option>
                ))}
              </select>
            </div>
          )}

          {addresses.length > 0 && <Separator />}

          <AddressForm
            onCreated={(address) => {
              setAddresses((prev) => [...(prev ?? []), address])
              setSelectedId(address.id)
            }}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            disabled={selectedId === null || submitting}
            onClick={handleCheckout}
          >
            {submitting ? 'Placing order...' : 'Place order'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default CheckoutPage
