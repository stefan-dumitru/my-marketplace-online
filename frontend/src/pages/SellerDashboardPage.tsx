import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  createProduct,
  getCategories,
  getMyProducts,
  updateProduct,
  uploadProductImage,
  ApiError,
  type Category,
  type SellerProduct,
} from '../api/client'

function flattenCategories(categories: Category[], depth = 0): { id: number; label: string }[] {
  return categories.flatMap((category) => [
    { id: category.id, label: `${'— '.repeat(depth)}${category.name}` },
    ...flattenCategories(category.children, depth + 1),
  ])
}

function ProductRow({
  product,
  categories,
  onUpdated,
}: {
  product: SellerProduct
  categories: { id: number; label: string }[]
  onUpdated: (product: SellerProduct) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description)
  const [price, setPrice] = useState(product.price)
  const [categoryId, setCategoryId] = useState(product.category_id)
  const [stockQuantity, setStockQuantity] = useState(product.stock_quantity)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    try {
      const updated = await updateProduct(product.id, {
        name,
        description,
        price,
        category_id: categoryId,
        stock_quantity: stockQuantity,
      })
      onUpdated(updated)
      setEditing(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  async function handleToggleActive() {
    const updated = await updateProduct(product.id, { is_active: !product.is_active })
    onUpdated(updated)
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadError(null)
    try {
      await uploadProductImage(product.id, file)
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed')
    }
  }

  if (!editing) {
    return (
      <li>
        {product.name} — {product.price} lei · stock {product.stock_quantity} ·{' '}
        {product.is_active ? 'active' : 'inactive'}{' '}
        <button type="button" onClick={() => setEditing(true)}>
          Edit
        </button>{' '}
        <button type="button" onClick={handleToggleActive}>
          {product.is_active ? 'Deactivate' : 'Activate'}
        </button>{' '}
        <label>
          Add image
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
        </label>
        {uploadError && <span role="alert"> {uploadError}</span>}
      </li>
    )
  }

  return (
    <li>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={description} onChange={(e) => setDescription(e.target.value)} />
      <input value={price} onChange={(e) => setPrice(e.target.value)} />
      <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={stockQuantity}
        onChange={(e) => setStockQuantity(Number(e.target.value))}
      />
      {error && <span role="alert"> {error}</span>}
      <button type="button" onClick={handleSave}>
        Save
      </button>
      <button type="button" onClick={() => setEditing(false)}>
        Cancel
      </button>
    </li>
  )
}

function SellerDashboardPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<SellerProduct[] | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [stockQuantity, setStockQuantity] = useState('0')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCategories().then(setCategories)
    getMyProducts()
      .then((page) => setProducts(page.items))
      .catch(() => setProducts([]))
  }, [])

  const flatCategories = flattenCategories(categories)

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (categoryId === '') {
      setError('Choose a category')
      return
    }
    try {
      const created = await createProduct({
        name,
        description,
        price,
        category_id: categoryId,
        stock_quantity: Number(stockQuantity),
      })
      setProducts((prev) => [created, ...(prev ?? [])])
      setName('')
      setDescription('')
      setPrice('')
      setStockQuantity('0')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  return (
    <main>
      <h1>Seller dashboard</h1>

      <h2>Add a product</h2>
      <form onSubmit={handleCreate}>
        <label htmlFor="name">Name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <label htmlFor="description">Description</label>
        <input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <label htmlFor="price">Price</label>
        <input id="price" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <label htmlFor="newCategory">Category</label>
        <select
          id="newCategory"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">Choose a category</option>
          {flatCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <label htmlFor="stock">Stock</label>
        <input
          id="stock"
          type="number"
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
        />
        {error && <p role="alert">{error}</p>}
        <button type="submit">Add product</button>
      </form>

      <h2>Your products</h2>
      {products === null && <p>Loading...</p>}
      {products !== null && products.length === 0 && <p>You have no products yet.</p>}
      {products !== null && products.length > 0 && (
        <ul>
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              categories={flatCategories}
              onUpdated={(updated) =>
                setProducts((prev) => (prev ?? []).map((p) => (p.id === updated.id ? updated : p)))
              }
            />
          ))}
        </ul>
      )}
    </main>
  )
}

export default SellerDashboardPage
