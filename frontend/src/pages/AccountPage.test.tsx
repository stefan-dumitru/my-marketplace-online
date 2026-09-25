import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import AccountPage from './AccountPage'
import * as client from '../api/client'

const USER = {
  id: 1,
  email: 'buyer@example.com',
  full_name: 'Test Buyer',
  is_admin: false,
}

const ADDRESS_A: client.Address = {
  id: 1,
  label: 'Home',
  recipient_name: 'Test Buyer',
  street: '1 Main St',
  city: 'Bucharest',
  region: 'Bucharest',
  postal_code: '010101',
  country: 'Romania',
  is_default: true,
  created_at: new Date().toISOString(),
}

const ADDRESS_B: client.Address = {
  ...ADDRESS_A,
  id: 2,
  label: 'Work',
  is_default: false,
}

function renderAccountPage() {
  return render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route path="/account" element={<AccountPage />} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AccountPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the current user profile when authenticated', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue(USER)
    vi.spyOn(client, 'getOrderSummary').mockResolvedValue({ in_progress_count: 3 })
    vi.spyOn(client, 'getAddresses').mockResolvedValue([])

    renderAccountPage()

    await waitFor(() => {
      expect(screen.getByText(/test buyer/i)).toBeInTheDocument()
    })
    expect(await screen.findByText(/3 order\(s\) in progress/)).toBeInTheDocument()
  })

  it('redirects to login when not authenticated', async () => {
    vi.spyOn(client, 'getCurrentUser').mockRejectedValue(new client.ApiError(401, 'not logged in'))

    renderAccountPage()

    await waitFor(() => {
      expect(screen.getByText('Login page')).toBeInTheDocument()
    })
  })

  it('lists saved addresses and marks the default one', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue(USER)
    vi.spyOn(client, 'getOrderSummary').mockResolvedValue({ in_progress_count: 0 })
    vi.spyOn(client, 'getAddresses').mockResolvedValue([ADDRESS_A, ADDRESS_B])

    renderAccountPage()

    expect(await screen.findByText(/Home — 1 Main St, Bucharest \(Default\)/)).toBeInTheDocument()
    expect(screen.getByText(/Work — 1 Main St, Bucharest/)).toBeInTheDocument()
  })

  it('sets a non-default address as default', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue(USER)
    vi.spyOn(client, 'getOrderSummary').mockResolvedValue({ in_progress_count: 0 })
    vi.spyOn(client, 'getAddresses').mockResolvedValue([ADDRESS_A, ADDRESS_B])
    const updateSpy = vi
      .spyOn(client, 'updateAddress')
      .mockResolvedValue({ ...ADDRESS_B, is_default: true })
    const user = userEvent.setup()

    renderAccountPage()

    await screen.findByText(/Work — 1 Main St, Bucharest/)
    const workRow = screen.getByText(/Work — 1 Main St, Bucharest/).closest('li')!
    await user.click(within(workRow).getByRole('button', { name: /set as default/i }))

    expect(updateSpy).toHaveBeenCalledWith(2, { is_default: true })
    await waitFor(() => {
      expect(screen.getByText(/Work — 1 Main St, Bucharest \(Default\)/)).toBeInTheDocument()
    })
  })

  it('deletes an address', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue(USER)
    vi.spyOn(client, 'getOrderSummary').mockResolvedValue({ in_progress_count: 0 })
    vi.spyOn(client, 'getAddresses')
      .mockResolvedValueOnce([ADDRESS_A, ADDRESS_B])
      .mockResolvedValueOnce([ADDRESS_A])
    const deleteSpy = vi.spyOn(client, 'deleteAddress').mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderAccountPage()

    await screen.findByText(/Work — 1 Main St, Bucharest/)
    const workRow = screen.getByText(/Work — 1 Main St, Bucharest/).closest('li')!
    await user.click(within(workRow).getByRole('button', { name: /^delete$/i }))

    expect(deleteSpy).toHaveBeenCalledWith(2)
    await waitFor(() => {
      expect(screen.queryByText(/Work — 1 Main St, Bucharest/)).not.toBeInTheDocument()
    })
  })

  it('deletes the account after confirming the password', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue(USER)
    vi.spyOn(client, 'getOrderSummary').mockResolvedValue({ in_progress_count: 0 })
    vi.spyOn(client, 'getAddresses').mockResolvedValue([])
    const deleteAccountSpy = vi
      .spyOn(client, 'deleteAccount')
      .mockResolvedValue({ message: 'Account deleted' })
    const user = userEvent.setup()

    renderAccountPage()

    await user.click(await screen.findByRole('button', { name: /delete my account/i }))
    await user.type(screen.getByLabelText(/confirm your password/i), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    expect(deleteAccountSpy).toHaveBeenCalledWith('correct horse battery staple')
    await waitFor(() => {
      expect(screen.getByText('Home page')).toBeInTheDocument()
    })
  })

  it('shows an error when account deletion fails', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue(USER)
    vi.spyOn(client, 'getOrderSummary').mockResolvedValue({ in_progress_count: 0 })
    vi.spyOn(client, 'getAddresses').mockResolvedValue([])
    vi.spyOn(client, 'deleteAccount').mockRejectedValue(
      new client.ApiError(401, 'Incorrect password'),
    )
    const user = userEvent.setup()

    renderAccountPage()

    await user.click(await screen.findByRole('button', { name: /delete my account/i }))
    await user.type(screen.getByLabelText(/confirm your password/i), 'wrong password')
    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/incorrect password/i)
    })
  })
})
