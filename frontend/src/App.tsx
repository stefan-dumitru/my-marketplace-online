import { BrowserRouter, Route, Routes } from 'react-router'
import AccountPage from './pages/AccountPage'
import AdminSellersPage from './pages/AdminSellersPage'
import CatalogPage from './pages/CatalogPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProductDetailPage from './pages/ProductDetailPage'
import SellerApplyPage from './pages/SellerApplyPage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import SignupPage from './pages/SignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/sell/apply" element={<SellerApplyPage />} />
        <Route path="/sell" element={<SellerDashboardPage />} />
        <Route path="/admin/sellers" element={<AdminSellersPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
