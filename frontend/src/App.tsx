import { BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'
import { ThemeProvider } from "@/components/theme-provider"
import { ChatbotProvider } from '@/context/ChatbotContext'
// import { Chatbot } from '@/components/Chatbot'
import { ChatbotWrapper } from '@/components/ChatbotWrapper'
import { routes } from './router/routes'
import './App.css'

function App() {
  const { initializeAuth, isInitialized, isAuthenticated } = useAuthStore()
  
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

    if (!isInitialized) {
    return <div>Loading Application...</div> // Or a proper spinner component
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ChatbotProvider>
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
          
          {/* Chatbot - only show when authenticated */}
          {isAuthenticated && (
            <ChatbotWrapper />
          )}
        </Router>
      </ChatbotProvider>
    </ThemeProvider>
  )
}

export default App