import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { checkout, getAddresses, ApiError, type Address, type CheckoutResult } from '../api/client'
import AddressForm from '../components/AddressForm'

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
      <main>
        <h1>Order placed</h1>
        {result.order_ids.length > 0 && (
          <p>
            Created {result.order_ids.length} order(s): {result.order_ids.join(', ')}
          </p>
        )}
        {result.skipped.length > 0 && (
          <div>
            <p>Some items couldn't be ordered:</p>
            <ul>
              {result.skipped.map((item) => (
                <li key={item.product_id}>
                  {item.product_name} — {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link to="/orders">View your orders</Link>
      </main>
    )
  }

  if (addresses === null) return <p>Loading...</p>

  return (
    <main>
      <h1>Checkout</h1>
      {addresses.length > 0 && (
        <div>
          <h2>Shipping address</h2>
          <select value={selectedId ?? ''} onChange={(e) => setSelectedId(Number(e.target.value))}>
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.label} — {address.street}, {address.city}
              </option>
            ))}
          </select>
        </div>
      )}
      <AddressForm
        onCreated={(address) => {
          setAddresses((prev) => [...(prev ?? []), address])
          setSelectedId(address.id)
        }}
      />
      {error && <p role="alert">{error}</p>}
      <button type="button" disabled={selectedId === null || submitting} onClick={handleCheckout}>
        {submitting ? 'Placing order...' : 'Place order'}
      </button>
    </main>
  )
}

export default CheckoutPage
