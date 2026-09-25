import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { applySeller, getMyApplication, ApiError, type SellerApplication } from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

  if (!checked) return <p className="text-muted-foreground">Loading...</p>

  if (application?.status === 'approved') {
    return (
      <main className="mx-auto w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Seller application</CardTitle>
            <CardDescription>
              You're an approved seller.{' '}
              <Link to="/sell" className="text-foreground underline underline-offset-4">
                Go to your seller dashboard
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  if (application?.status === 'pending') {
    return (
      <main className="mx-auto w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Seller application</CardTitle>
            <CardDescription>
              Your application for "{application.business_name}" is pending review.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Apply to become a seller</CardTitle>
          {application?.status === 'rejected' && (
            <CardDescription>
              Your previous application was rejected. You can apply again below.
            </CardDescription>
          )}
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Apply'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </main>
  )
}

export default SellerApplyPage
