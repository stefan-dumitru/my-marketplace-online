import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  deleteAccount,
  deleteAddress,
  getAddresses,
  getCurrentUser,
  getOrderSummary,
  logout,
  updateAddress,
  ApiError,
  type Address,
  type User,
} from '../api/client'
import AddressForm from '../components/AddressForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Status = 'loading' | 'ready' | 'unauthenticated'

function AddressRow({
  address,
  onUpdated,
  onDeleted,
}: {
  address: Address
  onUpdated: (address: Address) => void
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(address.label)
  const [recipientName, setRecipientName] = useState(address.recipient_name)
  const [street, setStreet] = useState(address.street)
  const [city, setCity] = useState(address.city)
  const [region, setRegion] = useState(address.region)
  const [postalCode, setPostalCode] = useState(address.postal_code)
  const [country, setCountry] = useState(address.country)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    try {
      const updated = await updateAddress(address.id, {
        label,
        recipient_name: recipientName,
        street,
        city,
        region,
        postal_code: postalCode,
        country,
      })
      onUpdated(updated)
      setEditing(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  async function handleSetDefault() {
    const updated = await updateAddress(address.id, { is_default: true })
    onUpdated(updated)
  }

  async function handleDelete() {
    await deleteAddress(address.id)
    onDeleted()
  }

  if (!editing) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
        <span>
          {address.label} — {address.street}, {address.city}
          {address.is_default ? ' (Default)' : ''}
        </span>
        <span className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          {!address.is_default && (
            <Button type="button" size="sm" variant="outline" onClick={handleSetDefault}>
              Set as default
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={handleDelete}>
            Delete
          </Button>
        </span>
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Recipient name</Label>
          <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label>Street</Label>
          <Input value={street} onChange={(e) => setStreet(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Region</Label>
          <Input value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Postal code</Label>
          <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Country</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleSave}>
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </li>
  )
}

function AccountPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [inProgressCount, setInProgressCount] = useState<number | null>(null)
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [password, setPassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u)
        setStatus('ready')
      })
      .catch(() => setStatus('unauthenticated'))
  }, [])

  function refreshAddresses() {
    getAddresses()
      .then(setAddresses)
      .catch(() => setAddresses([]))
  }

  useEffect(() => {
    if (status !== 'ready') return
    getOrderSummary()
      .then((summary) => setInProgressCount(summary.in_progress_count))
      .catch(() => setInProgressCount(null))
    refreshAddresses()
  }, [status])

  useEffect(() => {
    if (status === 'unauthenticated') {
      void navigate('/login')
    }
  }, [status, navigate])

  async function handleDeleteAccount(event: FormEvent) {
    event.preventDefault()
    setDeleteError(null)
    try {
      await deleteAccount(password)
      await navigate('/')
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  if (status !== 'ready' || !user) return null

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <p>
            <span className="text-muted-foreground">Name:</span> {user.full_name}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </p>
          {inProgressCount !== null && (
            <p>
              <Link to="/orders" className="underline underline-offset-4">
                {inProgressCount} order(s) in progress
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping addresses</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {addresses === null && <p className="text-muted-foreground">Loading addresses...</p>}
          {addresses !== null && addresses.length === 0 && (
            <p className="text-muted-foreground">You have no saved addresses yet.</p>
          )}
          {addresses !== null && addresses.length > 0 && (
            <ul className="flex flex-col gap-3">
              {addresses.map((address) => (
                <AddressRow
                  key={address.id}
                  address={address}
                  onUpdated={(updated) =>
                    setAddresses((prev) =>
                      (prev ?? []).map((a) =>
                        a.id === updated.id
                          ? updated
                          : updated.is_default
                            ? { ...a, is_default: false }
                            : a,
                      ),
                    )
                  }
                  onDeleted={refreshAddresses}
                />
              ))}
            </ul>
          )}
          <AddressForm
            onCreated={(address) => setAddresses((prev) => [...(prev ?? []), address])}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!confirmingDelete && (
            <Button
              type="button"
              variant="destructive"
              className="self-start"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete my account
            </Button>
          )}
          {confirmingDelete && (
            <form onSubmit={handleDeleteAccount} className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">
                This permanently anonymizes your account and cannot be undone.
              </p>
              <div className="flex max-w-xs flex-col gap-2">
                <Label htmlFor="deletePassword">Confirm your password</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {deleteError && (
                <Alert variant="destructive">
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button type="submit" variant="destructive">
                  Confirm delete
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => logout().then(() => navigate('/'))}
      >
        Log out
      </Button>
    </main>
  )
}

export default AccountPage
