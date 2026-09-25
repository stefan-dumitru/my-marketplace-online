import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getCategories, getProducts, type Category, type ProductListItem } from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const PAGE_SIZE = 20

function flattenCategories(categories: Category[], depth = 0): { id: number; label: string }[] {
  return categories.flatMap((category) => [
    { id: category.id, label: `${'— '.repeat(depth)}${category.name}` },
    ...flattenCategories(category.children, depth + 1),
  ])
}

const selectClassName =
  'border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ items: ProductListItem[]; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(searchInput), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  // Reset to page 1 whenever a filter changes. Computed during render (React's
  // documented pattern for "adjusting state when props/state change") rather
  // than in an effect, since that would cause an extra render + refetch.
  const filterKey = `${query}|${categoryId}|${minPrice}|${maxPrice}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setPage(1)
  }

  useEffect(() => {
    getProducts({
      q: query || undefined,
      categoryId: categoryId === '' ? undefined : categoryId,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((data) => {
        setResult({ items: data.items, total: data.total })
        setError(null)
      })
      .catch(() => setError('Could not load the catalog'))
  }, [query, categoryId, minPrice, maxPrice, page])

  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1
  const flatCategories = flattenCategories(categories)

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Catalog</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Product name or description"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className={selectClassName}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All categories</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="minPrice">Min price</Label>
          <Input id="minPrice" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxPrice">Max price</Label>
          <Input id="maxPrice" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!error && !result && <p className="text-muted-foreground">Loading...</p>}
      {!error && result && result.items.length === 0 && (
        <p className="text-muted-foreground">No products match your filters.</p>
      )}
      {!error && result && result.items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.items.map((product) => (
            <Link key={product.id} to={`/products/${product.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="line-clamp-2 text-base">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <p className="text-lg font-semibold">{product.price} lei</p>
                  <p className="text-muted-foreground text-xs">{product.category_name}</p>
                  <p className="text-muted-foreground text-xs">{product.seller_business_name}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {result && result.total > 0 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </main>
  )
}

export default CatalogPage
