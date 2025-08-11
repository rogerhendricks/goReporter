import { Link, useNavigate, useLocation } from 'react-router-dom'
import { HeartPulse, Menu, Stethoscope, Users, CircuitBoard } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '../mode-toggle'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const navLinks = [
    { href: '/patients', label: 'Patients', icon: Users },
    { href: '/doctors', label: 'Doctors', icon: Stethoscope },
    { href: '/devices', label: 'Devices', icon: CircuitBoard },
    { href: '/leads', label: 'Leads', icon: CircuitBoard },
    { href: '/search/patients', label: 'Search', icon: Users }
  ]

  return (
    <header className="px-4 lg:px-6 h-14 flex items-center bg-background border-b sticky top-0 z-50">
      <div className="flex items-center">
        <Link to="/" className="flex items-center justify-center mr-6">
          <HeartPulse className="h-6 w-6" />
          <span className="sr-only">CarePulse</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {isAuthenticated && navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location.pathname.startsWith(link.href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Auth buttons pushed to the right */}
      <div className="ml-auto flex items-center gap-4">
        {/* Theme Toggle */}
        <ModeToggle />

        {/* Authentication Links */}  
        {isAuthenticated ? (
          <Button variant="outline" onClick={handleLogout} className="hidden md:flex">Logout</Button>
        ) : (
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Login
            </Link>
            <Button asChild>
              <Link to="/register">Register</Link>
            </Button>
          </div>
        )}

        {/* Mobile Navigation Trigger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="grid gap-6 text-lg font-medium">
                <Link to="/" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <HeartPulse className="h-6 w-6" />
                  <span>CarePulse</span>
                </Link>
                {isAuthenticated ? (
                  <>
                    {navLinks.map(link => (
                       <Link
                        key={link.href}
                        to={link.href}
                        className={cn(
                          "hover:text-foreground flex items-center gap-2",
                          location.pathname.startsWith(link.href) && "text-foreground"
                        )}
                      >
                        <link.icon className="h-5 w-5" />
                        {link.label}
                      </Link>
                    ))}
                    <Button variant="outline" onClick={handleLogout} className="mt-4">Logout</Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="hover:text-foreground">Login</Link>
                    <Link to="/register" className="hover:text-foreground">Register</Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}