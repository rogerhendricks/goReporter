import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'
import { ThemeProvider } from "@/components/theme-provider"
import { routes } from './router/routes'
import './App.css'

function App() {
  const { initializeAuth, isAuthenticated } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
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
    </ThemeProvider>
  )
}

export default App