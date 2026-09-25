import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { MenuIcon } from 'lucide-react'
import {
  getCurrentUser,
  getMyApplication,
  logout,
  type SellerStatus,
  type User,
} from '@/api/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const ADMIN_LINKS = [
  { label: 'Sellers', to: '/admin/sellers' },
  { label: 'Products', to: '/admin/products' },
  { label: 'Categories', to: '/admin/categories' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Stats', to: '/admin/stats' },
]

function useSellerStatus(user: User | null) {
  const [status, setStatus] = useState<SellerStatus | 'none' | null>(null)

  useEffect(() => {
    if (!user || user.is_admin) return
    getMyApplication()
      .then((app) => setStatus(app.status))
      .catch(() => setStatus('none'))
  }, [user])

  return status
}

function SiteHeader() {
  const [user, setUser] = useState<User | null>(null)
  const [checked, setChecked] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sellerStatus = useSellerStatus(user)

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecked(true))
  }, [])

  async function handleLogout() {
    await logout()
    setUser(null)
    setMobileOpen(false)
  }

  const roleLinks = user?.is_admin
    ? ADMIN_LINKS
    : sellerStatus === 'approved'
      ? [{ label: 'Seller dashboard', to: '/sell' }]
      : sellerStatus !== null
        ? [{ label: 'Become a seller', to: '/sell/apply' }]
        : []

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Marketplace
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/catalog">Catalog</Link>
          </Button>

          {!checked ? null : user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/cart">Cart</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/orders">Orders</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {user.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user.is_admin && <DropdownMenuLabel>Admin</DropdownMenuLabel>}
                  {roleLinks.map((link) => (
                    <DropdownMenuItem key={link.to} asChild>
                      <Link to={link.to}>{link.label}</Link>
                    </DropdownMenuItem>
                  ))}
                  {roleLinks.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem asChild>
                    <Link to="/account">Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void handleLogout()}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <MenuIcon />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Marketplace</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              <Button
                asChild
                variant="ghost"
                className="justify-start"
                onClick={() => setMobileOpen(false)}
              >
                <Link to="/catalog">Catalog</Link>
              </Button>
              {checked && user ? (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    className="justify-start"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link to="/cart">Cart</Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="justify-start"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link to="/orders">Orders</Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="justify-start"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link to="/account">Account</Link>
                  </Button>
                  {roleLinks.map((link) => (
                    <Button
                      key={link.to}
                      asChild
                      variant="ghost"
                      className="justify-start"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to={link.to}>{link.label}</Link>
                    </Button>
                  ))}
                  <Button variant="ghost" className="justify-start" onClick={handleLogout}>
                    Log out
                  </Button>
                </>
              ) : (
                checked && (
                  <>
                    <Button
                      asChild
                      variant="ghost"
                      className="justify-start"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to="/login">Log in</Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      className="justify-start"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to="/signup">Sign up</Link>
                    </Button>
                  </>
                )
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

export default SiteHeader
