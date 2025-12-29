import { BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { useAuthStore } from './stores/authStore'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'
import { ThemeProvider } from "@/components/theme-provider"
import { useTheme } from "@/components/theme-provider"
import { routes } from './router/routes'
import './App.css'
import { fetchCSRFToken } from './utils/axios'

function AppContent() {
  const { initializeAuth, isInitialized, isAuthenticated } = useAuthStore()
  const { theme } = useTheme()
  
  useEffect(() => {
    fetchCSRFToken()
  }, [])

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  if (!isInitialized) {
    return <div>Loading Application...</div> // Or a proper spinner component
  }

  return (
    <>
      <Toaster 
        theme={theme === 'system' ? undefined : (theme as 'light' | 'dark')}
        position="top-right"
        richColors
        closeButton
        expand={false}
        toastOptions={{
          classNames: {
            toast: 'bg-card text-card-foreground border-border shadow-lg',
            title: 'text-foreground font-semibold',
            description: 'text-muted-foreground',
            actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
            cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/80',
            closeButton: 'bg-card border-border hover:bg-muted',
            error: 'bg-destructive text-destructive-foreground border-destructive',
            success: 'bg-green-600 text-white border-green-600',
            warning: 'bg-yellow-600 text-white border-yellow-600',
            info: 'bg-blue-600 text-white border-blue-600',
          },
        }}
      />
      
      <Router>
        <Routes>
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <LayoutWrapper layout={route.layout}>
                  {route.requiresAuth ? (
                    <ProtectedRoute roles={route.roles}>
                      {route.element}
                    </ProtectedRoute>
                  ) : (
                    route.element
                  )}
                </LayoutWrapper>
              }
            />
          ))}
          
          {/* Fallback route */}
          <Route 
            path="*" 
            element={
              <LayoutWrapper layout="home">
                <Navigate to={isAuthenticated ? "/" : "/login"} replace />
              </LayoutWrapper>
            } 
          />
        </Routes>
      </Router>
    </>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AppContent />
    </ThemeProvider>
  )
}

export default App