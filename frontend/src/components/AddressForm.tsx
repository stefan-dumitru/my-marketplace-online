import { useState } from 'react'
import type { FormEvent } from 'react'
import { createAddress, ApiError, type Address } from '../api/client'

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
      setLabel('Home')
      setRecipientName('')
      setStreet('')
      setCity('')
      setRegion('')
      setPostalCode('')
      setCountry('Romania')
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

export default AddressForm
