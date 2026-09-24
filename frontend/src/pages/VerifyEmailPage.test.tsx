import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import VerifyEmailPage from './VerifyEmailPage'
import * as client from '../api/client'

describe('VerifyEmailPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a success message when the token is valid', async () => {
    vi.spyOn(client, 'verifyEmail').mockResolvedValue({ message: 'Email verified' })

    render(
      <MemoryRouter initialEntries={['/verify-email?token=abc123']}>
        <VerifyEmailPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/your email is verified/i)).toBeInTheDocument()
    })
    expect(client.verifyEmail).toHaveBeenCalledWith('abc123')
  })

  it('shows an error message when the token is invalid or expired', async () => {
    vi.spyOn(client, 'verifyEmail').mockRejectedValue(
      new client.ApiError(400, 'Invalid or expired verification link'),
    )

    render(
      <MemoryRouter initialEntries={['/verify-email?token=bad']}>
        <VerifyEmailPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid or expired verification link')
    })
  })
})
