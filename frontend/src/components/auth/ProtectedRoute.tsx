import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, hasAccess } = useAuthStore()
  const location = useLocation()

  console.log('ProtectedRoute:', isAuthenticated)
  
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