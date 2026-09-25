import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getHealth, type HealthStatus } from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function HomePage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setError('Could not reach the backend'))
  }, [])

  return (
    <main className="flex flex-col gap-10">
      <Card className="mx-auto w-full max-w-2xl text-center">
        <CardHeader>
          <CardTitle className="text-3xl">Welcome to Marketplace</CardTitle>
          <CardDescription>
            Browse listings from independent sellers, or open your own storefront.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link to="/catalog">Browse the catalog</Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-xs">
        {error && <span role="alert">{error}</span>}
        {!error && !health && 'Checking backend status...'}
        {health && (
          <>
            Backend status: <strong>{health.status}</strong> · Database:{' '}
            <strong>{health.db}</strong>
          </>
        )}
      </p>
    </main>
  )
}

export default HomePage
