import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import SignupPage from './SignupPage'
import * as client from '../api/client'

describe('SignupPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a confirmation message after a successful signup', async () => {
    vi.spyOn(client, 'signup').mockResolvedValue({ message: 'Check your email' })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/full name/i), 'Test Buyer')
    await user.type(screen.getByLabelText(/email/i), 'buyer@example.com')
    await user.type(screen.getByLabelText(/password/i), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  it('shows the server error message when signup fails', async () => {
    vi.spyOn(client, 'signup').mockRejectedValue(
      new client.ApiError(409, 'Email already registered'),
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/full name/i), 'Test Buyer')
    await user.type(screen.getByLabelText(/email/i), 'buyer@example.com')
    await user.type(screen.getByLabelText(/password/i), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email already registered')
    })
  })
})
