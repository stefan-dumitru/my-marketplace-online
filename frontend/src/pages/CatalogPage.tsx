import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getCategories, getProducts, type Category, type ProductListItem } from '../api/client'

const PAGE_SIZE = 20

function flattenCategories(categories: Category[], depth = 0): { id: number; label: string }[] {
  return categories.flatMap((category) => [
    { id: category.id, label: `${'— '.repeat(depth)}${category.name}` },
    ...flattenCategories(category.children, depth + 1),
  ])
}

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
    <main>
      <h1>Catalog</h1>
      <div>
        <label htmlFor="search">Search</label>
        <input
          id="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Product name or description"
        />
      </div>
      <div>
        <label htmlFor="category">Category</label>
        <select
          id="category"
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
      <div>
        <label htmlFor="minPrice">Min price</label>
        <input id="minPrice" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
        <label htmlFor="maxPrice">Max price</label>
        <input id="maxPrice" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
      </div>

      {error && <p role="alert">{error}</p>}
      {!error && !result && <p>Loading...</p>}
      {!error && result && result.items.length === 0 && <p>No products match your filters.</p>}
      {!error && result && result.items.length > 0 && (
        <ul>
          {result.items.map((product) => (
            <li key={product.id}>
              <Link to={`/products/${product.id}`}>{product.name}</Link> — {product.price} lei ·{' '}
              {product.category_name} · {product.seller_business_name}
            </li>
          ))}
        </ul>
      )}

      {result && result.total > 0 && (
        <div>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            {' '}
            Page {page} of {totalPages}{' '}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </main>
  )
}

export default CatalogPage
