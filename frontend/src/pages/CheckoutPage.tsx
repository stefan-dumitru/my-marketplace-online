import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import {
  checkout,
  createAddress,
  getAddresses,
  ApiError,
  type Address,
  type CheckoutResult,
} from '../api/client'

function AddressForm({ onCreated }: { onCreated: (address: Address) => void }) {
  const [label, setLabel] = useState('Home')
  const [recipientName, setRecipientName] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Romania')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const address = await createAddress({
        label,
        recipient_name: recipientName,
        street,
        city,
        region,
        postal_code: postalCode,
        country,
      })
      onCreated(address)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add a shipping address</h2>
      <label htmlFor="label">Label</label>
      <input id="label" value={label} onChange={(e) => setLabel(e.target.value)} required />
      <label htmlFor="recipientName">Recipient name</label>
      <input
        id="recipientName"
        value={recipientName}
        onChange={(e) => setRecipientName(e.target.value)}
        required
      />
      <label htmlFor="street">Street</label>
      <input id="street" value={street} onChange={(e) => setStreet(e.target.value)} required />
      <label htmlFor="city">City</label>
      <input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
      <label htmlFor="region">Region</label>
      <input id="region" value={region} onChange={(e) => setRegion(e.target.value)} required />
      <label htmlFor="postalCode">Postal code</label>
      <input
        id="postalCode"
        value={postalCode}
        onChange={(e) => setPostalCode(e.target.value)}
        required
      />
      <label htmlFor="country">Country</label>
      <input id="country" value={country} onChange={(e) => setCountry(e.target.value)} required />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Save address</button>
    </form>
  )
}

function CheckoutPage() {
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getAddresses().then((list) => {
      setAddresses(list)
      if (list.length > 0) setSelectedId(list[0].id)
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
