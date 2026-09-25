import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { verifyEmail, ApiError } from '../api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
    <main className="mx-auto w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Email verification</CardTitle>
          {effectiveStatus === 'verifying' && <CardDescription>Verifying...</CardDescription>}
          {effectiveStatus === 'success' && (
            <CardDescription>
              Your email is verified.{' '}
              <Link to="/login" className="text-foreground underline underline-offset-4">
                Log in
              </Link>
            </CardDescription>
          )}
        </CardHeader>
        {effectiveStatus === 'error' && (
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>
    </main>
  )
}

export default VerifyEmailPage
