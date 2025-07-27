import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Button } from "@/components/ui/button"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { Users } from 'lucide-react'

export default function Home() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const breadcrumbItems = [
    { label: 'Home', current: true }
  ]

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Welcome, {user?.username}!</h1>
          <div className="space-x-4">
            <Button onClick={() => navigate('/patients')}>
              <Users className="h-4 w-4" />
              View Patients
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}