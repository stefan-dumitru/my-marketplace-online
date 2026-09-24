const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export interface HealthStatus {
  status: string
  db: string
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/health`)
  return (await response.json()) as HealthStatus
}
