import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import LoginPage from './LoginPage'
import * as client from '../api/client'

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<p>Account page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates to the account page after a successful login', async () => {
    vi.spyOn(client, 'login').mockResolvedValue({
      id: 1,
      email: 'buyer@example.com',
      full_name: 'Test Buyer',
      is_admin: false,
    })
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText(/email/i), 'buyer@example.com')
    await user.type(screen.getByLabelText(/password/i), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByText('Account page')).toBeInTheDocument()
    })
  })

  it('shows an inline error on invalid credentials', async () => {
    vi.spyOn(client, 'login').mockRejectedValue(
      new client.ApiError(401, 'Invalid email or password'),
    )
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText(/email/i), 'buyer@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong password')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
    })
  })
})
