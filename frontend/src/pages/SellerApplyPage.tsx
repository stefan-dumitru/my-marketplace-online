import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { applySeller, getMyApplication, ApiError, type SellerApplication } from '../api/client'

function SellerApplyPage() {
  const [application, setApplication] = useState<SellerApplication | null>(null)
  const [checked, setChecked] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getMyApplication()
      .then(setApplication)
      .catch(() => setApplication(null))
      .finally(() => setChecked(true))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await applySeller(businessName)
      setApplication(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (!checked) return <p>Loading...</p>

  if (application?.status === 'approved') {
    return (
      <main>
        <h1>Seller application</h1>
        <p>
          You're an approved seller. <Link to="/sell">Go to your seller dashboard</Link>
        </p>
      </main>
    )
  }

  if (application?.status === 'pending') {
    return (
      <main>
        <h1>Seller application</h1>
        <p>Your application for "{application.business_name}" is pending review.</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Apply to become a seller</h1>
      {application?.status === 'rejected' && (
        <p>Your previous application was rejected. You can apply again below.</p>
      )}
      <form onSubmit={handleSubmit}>
        <label htmlFor="businessName">Business name</label>
        <input
          id="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
        />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Apply'}
        </button>
      </form>
    </main>
  )
}

export default SellerApplyPage
