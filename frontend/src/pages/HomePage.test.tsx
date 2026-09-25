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

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the backend')
    })
  })

  it('links to the catalog', async () => {
    vi.spyOn(client, 'getHealth').mockResolvedValue({ status: 'ok', db: 'ok' })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: /browse the catalog/i })).toHaveAttribute(
      'href',
      '/catalog',
    )
  })
})
