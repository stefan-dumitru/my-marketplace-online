import { useState } from 'react'
import type { FormEvent } from 'react'
import { createAddress, ApiError, type Address } from '../api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">Add a shipping address</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="label">Label</Label>
          <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="recipientName">Recipient name</Label>
          <Input
            id="recipientName"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            required
          />
        </div>
        <div className="col-span-2 flex flex-col gap-2">
          <Label htmlFor="street">Street</Label>
          <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="region">Region</Label>
          <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="postalCode">Postal code</Label>
          <Input
            id="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="self-start">
        Save address
      </Button>
    </form>
  )
}

export default AddressForm
