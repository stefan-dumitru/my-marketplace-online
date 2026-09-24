import { useEffect, useState } from 'react'
import { getHealth, type HealthStatus } from './api/client'

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setError('Could not reach the backend'))
  }, [])

  return (
    <main>
      <h1>Marketplace</h1>
      {error && <p role="alert">{error}</p>}
      {!error && !health && <p>Checking backend status...</p>}
      {health && (
        <p>
          Backend status: <strong>{health.status}</strong> · Database: <strong>{health.db}</strong>
        </p>
      )}
    </main>
  )
}

export default App
