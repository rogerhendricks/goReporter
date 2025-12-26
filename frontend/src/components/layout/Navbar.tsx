import { Link, useNavigate, useLocation } from 'react-router-dom'
import { HeartPulse, Menu, Stethoscope, Users, CircuitBoard, ChevronDown, ChevronRight, User2, LogOut, Sun, Moon, Monitor, Check, Settings, Search, FileSpreadsheet, Eye, Palette } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
import { useState } from 'react'

export function Navbar() {
  const { user, isAuthenticated, logout, hasAccess } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [showThemeOptions, setShowThemeOptions] = useState(false)
  const [showMobileThemeOptions, setShowMobileThemeOptions] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const handleSearchClick = () => {
    document.dispatchEvent(new Event('toggle-command-palette'))
  }

  // Detect OS for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  const navLinks = [
    { href: '/admin', label: 'Dashboard', icon: Settings, roles: ['admin'] },
    { href: '/doctor', label: 'Dashboard', icon: Stethoscope, roles: ['doctor'] },
    { href: '/patients', label: 'Patients', icon: Users, roles: ['admin', 'doctor', 'user'] },
    { href: '/search/patients', label: '+Search', icon: Users, roles: ['admin', 'doctor', 'user'] },
    { href: '/tasks', label: 'Tasks', icon: Check, roles: ['admin', 'doctor', 'user'] },
    { href: '/doctors', label: 'Doctors', icon: Stethoscope, roles: ['admin', 'doctor'] },
    { href: '/devices', label: 'Devices', icon: CircuitBoard, roles: ['admin'] },
    { href: '/leads', label: 'Leads', icon: CircuitBoard, roles: ['admin'] },
    { href: '/webhooks', label: 'Webhooks', icon: FileSpreadsheet, roles: ['admin'],}
  ]

  // Filter nav links based on user role
  const visibleNavLinks = navLinks.filter(link => 
    !link.roles || hasAccess(link.roles)
  )

  const displayName =
    user?.username || [user?.username].filter(Boolean).join(' ') || 'Account'

  return (
    <header className="px-4 lg:px- h-12 flex items-center bg-background border-b sticky top-2 z-50">
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
          <>

          <Button variant="outline" className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64" onClick={handleSearchClick}>
            <Search className="mr-2 h-4 w-4" />
            <span>Search...</span>
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">{isMac ? '⌘' : 'Ctrl'}</span>K
            </kbd>
          </Button>
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
              
              {/* Theme Section */}
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault()
                  setShowThemeOptions(!showThemeOptions)
                }}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Theme
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 transition-transform",
                  showThemeOptions && "rotate-90"
                )} />
              </DropdownMenuItem>
              
              {showThemeOptions && (
                <>
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      setTheme("light")
                    }} 
                    className="pl-8"
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                    {theme === "light" && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      setTheme("dark")
                    }} 
                    className="pl-8"
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                    {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      setTheme("system")
                    }} 
                    className="pl-8"
                  >
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                    {theme === "system" && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      setTheme("medical-blue")
                    }} 
                    className="pl-8"
                  >
                    <Stethoscope className="mr-2 h-4 w-4" />
                    Medical Blue
                    {theme === "medical-blue" && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      setTheme("high-contrast")
                    }} 
                    className="pl-8"
                  >
                    <Eye className="h-4 w-4" />
                    High Contrast
                    {theme === "high-contrast" && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </>
        
        )}

      </div>

      {/* Mobile Navigation Trigger */}
      <div className="md:hidden ml-auto">
        {isAuthenticated && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleSearchClick}
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
        )}
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
              <nav className="grid gap-6 text-lg font-medium pl-4 pr-4">
                <Link to="/" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <HeartPulse className="h-6 w-6" />
                  <span>RPM Fusion</span>
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
                    
                    {/* Mobile Theme Section */}
                    <div className="border-t pt-4">
                      <button
                        onClick={() => setShowMobileThemeOptions(!showMobileThemeOptions)}
                        className="flex items-center justify-between w-full hover:text-foreground transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Palette className="h-5 w-5" />
                          <span className="text-lg font-medium">Theme</span>
                        </div>
                        <ChevronRight className={cn(
                          "h-5 w-5 transition-transform",
                          showMobileThemeOptions && "rotate-90"
                        )} />
                      </button>
                      
                      {showMobileThemeOptions && (
                        <div className="mt-2 ml-7 space-y-2">
                          <button
                            onClick={() => setTheme("light")}
                            className={cn(
                              "flex items-center gap-2 w-full py-2 hover:text-foreground transition-colors",
                              theme === "light" && "text-foreground font-medium"
                            )}
                          >
                            <Sun className="h-4 w-4" />
                            Light
                            {theme === "light" && <Check className="ml-auto h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setTheme("dark")}
                            className={cn(
                              "flex items-center gap-2 w-full py-2 hover:text-foreground transition-colors",
                              theme === "dark" && "text-foreground font-medium"
                            )}
                          >
                            <Moon className="h-4 w-4" />
                            Dark
                            {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setTheme("system")}
                            className={cn(
                              "flex items-center gap-2 w-full py-2 hover:text-foreground transition-colors",
                              theme === "system" && "text-foreground font-medium"
                            )}
                          >
                            <Monitor className="h-4 w-4" />
                            System
                            {theme === "system" && <Check className="ml-auto h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setTheme("medical-blue")}
                            className={cn(
                              "flex items-center gap-2 w-full py-2 hover:text-foreground transition-colors",
                              theme === "medical-blue" && "text-foreground font-medium"
                            )}
                          >
                            <Stethoscope className="h-4 w-4" />
                            Medical Blue
                            {theme === "medical-blue" && <Check className="ml-auto h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setTheme("high-contrast")}
                            className={cn(
                              "flex items-center gap-2 w-full py-2 hover:text-foreground transition-colors",
                              theme === "high-contrast" && "text-foreground font-medium"
                            )}
                          >
                            <Eye className="h-4 w-4" />
                            High Contrast
                            {theme === "high-contrast" && <Check className="ml-auto h-4 w-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="font-medium">{user?.username}</div>
                      <div className="text-xs text-muted-foreground">{user?.email}</div>
                      <div className="text-xs text-muted-foreground capitalize">Role: {user?.role}</div>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="mt-4 w-full">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="hover:text-foreground">Login</Link>
                  </>
                )}
              </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}