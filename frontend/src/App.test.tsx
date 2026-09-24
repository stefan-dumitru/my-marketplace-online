import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as client from './api/client'

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the backend health status once loaded', async () => {
    vi.spyOn(client, 'getHealth').mockResolvedValue({ status: 'ok', db: 'ok' })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/backend status/i)).toBeInTheDocument()
    })
    expect(screen.getAllByText('ok')).toHaveLength(2)
  })

  it('shows an error message when the backend is unreachable', async () => {
    vi.spyOn(client, 'getHealth').mockRejectedValue(new Error('network error'))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the backend')
    })
  })
})
