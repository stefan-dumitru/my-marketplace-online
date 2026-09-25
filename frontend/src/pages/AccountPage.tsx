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
      <li>
        {address.label} — {address.street}, {address.city}
        {address.is_default ? ' (Default)' : ''}{' '}
        <button type="button" onClick={() => setEditing(true)}>
          Edit
        </button>{' '}
        {!address.is_default && (
          <button type="button" onClick={handleSetDefault}>
            Set as default
          </button>
        )}{' '}
        <button type="button" onClick={handleDelete}>
          Delete
        </button>
      </li>
    )
  }

  return (
    <li>
      <label>
        Label
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>
      <label>
        Recipient name
        <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
      </label>
      <label>
        Street
        <input value={street} onChange={(e) => setStreet(e.target.value)} />
      </label>
      <label>
        City
        <input value={city} onChange={(e) => setCity(e.target.value)} />
      </label>
      <label>
        Region
        <input value={region} onChange={(e) => setRegion(e.target.value)} />
      </label>
      <label>
        Postal code
        <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
      </label>
      <label>
        Country
        <input value={country} onChange={(e) => setCountry(e.target.value)} />
      </label>
      {error && <span role="alert"> {error}</span>}
      <button type="button" onClick={handleSave}>
        Save
      </button>
      <button type="button" onClick={() => setEditing(false)}>
        Cancel
      </button>
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
    <main>
      <h1>Account</h1>
      <p>Name: {user.full_name}</p>
      <p>Email: {user.email}</p>
      {inProgressCount !== null && (
        <p>
          <Link to="/orders">{inProgressCount} order(s) in progress</Link>
        </p>
      )}

      <h2>Shipping addresses</h2>
      {addresses === null && <p>Loading addresses...</p>}
      {addresses !== null && addresses.length === 0 && <p>You have no saved addresses yet.</p>}
      {addresses !== null && addresses.length > 0 && (
        <ul>
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
      <AddressForm onCreated={(address) => setAddresses((prev) => [...(prev ?? []), address])} />

      <h2>Delete account</h2>
      {!confirmingDelete && (
        <button type="button" onClick={() => setConfirmingDelete(true)}>
          Delete my account
        </button>
      )}
      {confirmingDelete && (
        <form onSubmit={handleDeleteAccount}>
          <p>This permanently anonymizes your account and cannot be undone.</p>
          <label htmlFor="deletePassword">Confirm your password</label>
          <input
            id="deletePassword"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {deleteError && <p role="alert">{deleteError}</p>}
          <button type="submit">Confirm delete</button>
          <button type="button" onClick={() => setConfirmingDelete(false)}>
            Cancel
          </button>
        </form>
      )}

      <button type="button" onClick={() => logout().then(() => navigate('/'))}>
        Log out
      </button>
    </main>
  )
}

export default AccountPage
