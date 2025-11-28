import { Link, useNavigate, useLocation } from 'react-router-dom'
import { HeartPulse, Menu, Stethoscope, Users, CircuitBoard, ChevronDown, User2, LogOut, Sun, Moon, Monitor, Check, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
// import { ModeToggle } from '../mode-toggle'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import logoUrl from '../../assets/rpm-fusion-logo.min.svg'

export function Navbar() {
  const { user, isAuthenticated, logout, hasAccess } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const navLinks = [
    { href: '/patients', label: 'Patients', icon: Users, roles: ['admin', 'doctor', 'user'] },
    { href: '/doctors', label: 'Doctors', icon: Stethoscope, roles: ['admin', 'doctor'] },
    { href: '/devices', label: 'Devices', icon: CircuitBoard, roles: ['admin'] },
    { href: '/leads', label: 'Leads', icon: CircuitBoard, roles: ['admin'] },
    { href: '/search/patients', label: '+Search', icon: Users, roles: ['admin', 'doctor', 'user'] },
    { href: '/tasks', label: 'Tasks', icon: Check, roles: ['admin', 'doctor', 'user'] },
    { href: '/admin', label: 'Admin Dashboard', icon: Settings, roles: ['admin'] },
    { href: '/doctor', label: 'Doctor Dashboard', icon: Stethoscope, roles: ['doctor'] }
  ]

  // Filter nav links based on user role
  const visibleNavLinks = navLinks.filter(link => 
    !link.roles || hasAccess(link.roles)
  )

  const displayName =
    user?.username || [user?.username].filter(Boolean).join(' ') || 'Account'

  return (
    <header className="px-4 lg:px-6 h-12 flex items-center bg-background border-b sticky top-0 z-50">
      <div className="flex items-center">
        <Link to="/" className="flex items-center justify-center mr-6">
        <img
        src={logoUrl}
        alt="RPM Fusion — Remote Patient Management"
        className="h-11 w-auto"
        />
        <span className="sr-only">RPM Fusion</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {isAuthenticated && visibleNavLinks.map((link) => (
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

      {/* Right side: user dropdown */}
      <div className="ml-auto hidden md:flex items-center gap-2">
        {isAuthenticated && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <User2 className="h-4 w-4" />
                <span className="truncate max-w-[12rem]">{displayName}</span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="font-medium">{displayName}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
                <div className="text-xs text-muted-foreground capitalize">Role: {user?.role}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                Light
                {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
                {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" />
                System
                {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Mobile Navigation Trigger */}
      <div className="md:hidden ml-auto">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
              <SheetHeader>
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-6 text-lg font-medium">
                <Link to="/" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <HeartPulse className="h-6 w-6" />
                  <span>CarePulse</span>
                </Link>
                {isAuthenticated ? (
                  <>
                    {visibleNavLinks.map(link => (
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
                  <div className="border-t pt-4 mt-auto">
                    <div className="font-medium">{user?.username}</div>
                    <div className="text-xs text-muted-foreground">{user?.email}</div>
                    <div className="text-xs text-muted-foreground capitalize">Role: {user?.role}</div>
                  </div>
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
    </header>
  )
}