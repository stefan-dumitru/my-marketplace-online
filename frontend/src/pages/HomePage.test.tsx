import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import HomePage from './HomePage'
import * as client from '../api/client'

describe('HomePage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the backend health status once loaded', async () => {
    vi.spyOn(client, 'getHealth').mockResolvedValue({ status: 'ok', db: 'ok' })
    vi.spyOn(client, 'getCurrentUser').mockRejectedValue(new client.ApiError(401, 'not logged in'))

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/backend status/i)).toBeInTheDocument()
    })
    expect(screen.getAllByText('ok')).toHaveLength(2)
  })

  it('shows an error message when the backend is unreachable', async () => {
    vi.spyOn(client, 'getHealth').mockRejectedValue(new Error('network error'))
    vi.spyOn(client, 'getCurrentUser').mockRejectedValue(new client.ApiError(401, 'not logged in'))

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the backend')
    })
  })

  it('shows login/signup links when logged out', async () => {
    vi.spyOn(client, 'getHealth').mockResolvedValue({ status: 'ok', db: 'ok' })
    vi.spyOn(client, 'getCurrentUser').mockRejectedValue(new client.ApiError(401, 'not logged in'))

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Log in')).toBeInTheDocument()
    expect(screen.getByText('Sign up')).toBeInTheDocument()
  })

  it('shows the logged-in email and a logout option when authenticated', async () => {
    vi.spyOn(client, 'getHealth').mockResolvedValue({ status: 'ok', db: 'ok' })
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 1,
      email: 'buyer@example.com',
      full_name: 'Test Buyer',
      is_admin: false,
    })
    vi.spyOn(client, 'getMyApplication').mockRejectedValue(
      new client.ApiError(404, 'No application found'),
    )

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Logged in as buyer@example.com/)).toBeInTheDocument()
    expect(await screen.findByText('Become a seller')).toBeInTheDocument()
  })

  it('shows a seller applications link for admins', async () => {
    vi.spyOn(client, 'getHealth').mockResolvedValue({ status: 'ok', db: 'ok' })
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      full_name: 'Admin',
      is_admin: true,
    })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Seller applications')).toBeInTheDocument()
  })
})
