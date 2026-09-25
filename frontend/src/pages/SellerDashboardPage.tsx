import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router'
import {
  createProduct,
  getCategories,
  getMyProducts,
  getMyStats,
  updateProduct,
  uploadProductImage,
  ApiError,
  type Category,
  type SellerProduct,
  type SellerStats,
} from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const selectClassName =
  'border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

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
      <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
        <span>
          {product.name} — {product.price} lei · stock {product.stock_quantity} ·{' '}
          {product.is_active ? 'active' : 'inactive'}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleToggleActive}>
            {product.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <span>Add image</span>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="max-w-52"
            />
          </label>
          {uploadError && (
            <Alert variant="destructive" className="w-full">
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
        </span>
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border p-3">
      <div className="grid grid-cols-2 gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input value={price} onChange={(e) => setPrice(e.target.value)} />
        <select
          className={selectClassName}
          value={categoryId}
          onChange={(e) => setCategoryId(Number(e.target.value))}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <Input
          type="number"
          value={stockQuantity}
          onChange={(e) => setStockQuantity(Number(e.target.value))}
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleSave}>
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
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
  const [stats, setStats] = useState<SellerStats | null>(null)

  useEffect(() => {
    getCategories().then(setCategories)
    getMyProducts()
      .then((page) => setProducts(page.items))
      .catch(() => setProducts([]))
    getMyStats()
      .then(setStats)
      .catch(() => setStats(null))
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Seller dashboard</h1>
        <Link to="/sell/orders" className="text-sm underline underline-offset-4">
          View orders to fulfill
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your stats</CardTitle>
        </CardHeader>
        <CardContent>
          {stats === null && <p className="text-muted-foreground">Loading stats...</p>}
          {stats !== null && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-6">
                <p>
                  <span className="text-muted-foreground">Total orders:</span> {stats.total_orders}
                </p>
                <p>
                  <span className="text-muted-foreground">Total revenue:</span>{' '}
                  {stats.total_revenue} lei
                </p>
              </div>
              {stats.top_products.length === 0 ? (
                <p className="text-muted-foreground">No sales yet.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {stats.top_products.map((product) => (
                    <li key={product.product_id}>
                      {product.product_name} — {product.quantity_sold} sold
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a product</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreate}>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newCategory">Category</Label>
              <select
                id="newCategory"
                className={selectClassName}
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
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
              />
            </div>
            {error && (
              <Alert variant="destructive" className="col-span-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="col-span-2 self-start">
              Add product
            </Button>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your products</CardTitle>
        </CardHeader>
        <CardContent>
          {products === null && <p className="text-muted-foreground">Loading...</p>}
          {products !== null && products.length === 0 && (
            <p className="text-muted-foreground">You have no products yet.</p>
          )}
          {products !== null && products.length > 0 && (
            <ul className="flex flex-col gap-3">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  categories={flatCategories}
                  onUpdated={(updated) =>
                    setProducts((prev) =>
                      (prev ?? []).map((p) => (p.id === updated.id ? updated : p)),
                    )
                  }
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

export default SellerDashboardPage
