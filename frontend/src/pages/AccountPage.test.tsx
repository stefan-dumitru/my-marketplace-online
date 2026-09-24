import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import AccountPage from './AccountPage'
import * as client from '../api/client'

function renderAccountPage() {
  return render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route path="/account" element={<AccountPage />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AccountPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the current user profile when authenticated', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 1,
      email: 'buyer@example.com',
      full_name: 'Test Buyer',
      is_admin: false,
    })

    renderAccountPage()

    await waitFor(() => {
      expect(screen.getByText(/test buyer/i)).toBeInTheDocument()
    })
  })

  it('redirects to login when not authenticated', async () => {
    vi.spyOn(client, 'getCurrentUser').mockRejectedValue(new client.ApiError(401, 'not logged in'))

    renderAccountPage()

    await waitFor(() => {
      expect(screen.getByText('Login page')).toBeInTheDocument()
    })
  })
})
