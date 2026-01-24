import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, hasAccess, isInitialized } = useAuthStore()
  const location = useLocation()

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login page with the current location saved in state
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !hasAccess(roles)) {
    // Redirect to unauthorized page if the user doesn't have access
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
