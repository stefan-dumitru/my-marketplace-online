import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCurrentUser,
  ApiError,
  type Category,
} from '../api/client'

type AccessStatus = 'checking' | 'allowed' | 'denied'

function flattenCategories(categories: Category[], depth = 0): { id: number; label: string }[] {
  return categories.flatMap((category) => [
    { id: category.id, label: `${'— '.repeat(depth)}${category.name}` },
    ...flattenCategories(category.children, depth + 1),
  ])
}

function AdminCategoriesPage() {
  const [access, setAccess] = useState<AccessStatus>('checking')
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [parentId, setParentId] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function reload() {
    getCategories().then(setCategories)
  }

  useEffect(() => {
    getCurrentUser()
      .then((user) => setAccess(user.is_admin ? 'allowed' : 'denied'))
      .catch(() => setAccess('denied'))
  }, [])

  useEffect(() => {
    if (access === 'allowed') reload()
  }, [access])

  if (access === 'checking') return <p>Loading...</p>
  if (access === 'denied') return <p role="alert">You don't have permission to view this page.</p>

  const flat = flattenCategories(categories)

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createCategory(name, slug, parentId === '' ? undefined : parentId)
      setName('')
      setSlug('')
      setParentId('')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  async function handleDelete(id: number) {
    setDeleteError(null)
    try {
      await deleteCategory(id)
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this category')
    }
  }

  return (
    <main>
      <h1>Categories</h1>

      <h2>Add a category</h2>
      <form onSubmit={handleCreate}>
        <label htmlFor="catName">Name</label>
        <input id="catName" value={name} onChange={(e) => setName(e.target.value)} required />
        <label htmlFor="catSlug">Slug</label>
        <input id="catSlug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        <label htmlFor="catParent">Parent</label>
        <select
          id="catParent"
          value={parentId}
          onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">None (top-level)</option>
          {flat.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {error && <p role="alert">{error}</p>}
        <button type="submit">Add category</button>
      </form>

      <h2>Existing categories</h2>
      {deleteError && <p role="alert">{deleteError}</p>}
      <ul>
        {flat.map((c) => (
          <li key={c.id}>
            {c.label}{' '}
            <button type="button" onClick={() => handleDelete(c.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default AdminCategoriesPage
