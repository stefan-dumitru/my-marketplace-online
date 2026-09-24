import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { verifyEmail, ApiError } from '../api/client'

type Status = 'verifying' | 'success' | 'error'

function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>('verifying')
  const [error, setError] = useState<string | null>(token ? null : 'Missing verification token')
  // The verify-email call consumes the token server-side, so it must never
  // fire twice — guard against React StrictMode's dev-only double effect.
  const hasRequested = useRef(false)

  useEffect(() => {
    if (!token || hasRequested.current) return
    hasRequested.current = true
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setError(err instanceof ApiError ? err.message : 'Something went wrong')
      })
  }, [token])

  const effectiveStatus: Status = token ? status : 'error'

  return (
    <main>
      <h1>Email verification</h1>
      {effectiveStatus === 'verifying' && <p>Verifying...</p>}
      {effectiveStatus === 'success' && (
        <p>
          Your email is verified. <Link to="/login">Log in</Link>
        </p>
      )}
      {effectiveStatus === 'error' && <p role="alert">{error}</p>}
    </main>
  )
}

export default VerifyEmailPage
