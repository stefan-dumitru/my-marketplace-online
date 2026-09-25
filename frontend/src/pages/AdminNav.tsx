import { Link } from 'react-router'

function AdminNav() {
  return (
    <p>
      <Link to="/admin/sellers">Sellers</Link> · <Link to="/admin/products">Products</Link> ·{' '}
      <Link to="/admin/categories">Categories</Link> · <Link to="/admin/orders">Orders</Link> ·{' '}
      <Link to="/admin/stats">Stats</Link>
    </p>
  )
}

export default AdminNav
