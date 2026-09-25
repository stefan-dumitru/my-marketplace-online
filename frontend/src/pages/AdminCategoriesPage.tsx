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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

type AccessStatus = 'checking' | 'allowed' | 'denied'

const selectClassName =
  'border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

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

  if (access === 'checking') return <p className="text-muted-foreground">Loading...</p>
  if (access === 'denied')
    return (
      <Alert variant="destructive">
        <AlertDescription>You don't have permission to view this page.</AlertDescription>
      </Alert>
    )

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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add a category</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreate}>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="catName">Name</Label>
              <Input id="catName" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="catSlug">Slug</Label>
              <Input id="catSlug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="catParent">Parent</Label>
              <select
                id="catParent"
                className={selectClassName}
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
            </div>
            {error && (
              <Alert variant="destructive" className="col-span-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="col-span-2 self-start">
              Add category
            </Button>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing categories</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <ul className="flex flex-col gap-2">
            {flat.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <span>{c.label}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(c.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  )
}

export default AdminCategoriesPage
