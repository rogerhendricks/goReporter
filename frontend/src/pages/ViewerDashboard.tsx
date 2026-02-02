import { Card, CardContent,  CardHeader, CardTitle } from '@/components/ui/card'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'

import { useAuthStore } from '@/stores/authStore'
import { formatDistanceToNow } from 'date-fns'



export default function ViewerDashboard() {
    const user = useAuthStore((state) => state.user)
    
    const breadcrumbItems = [
        { label: 'Home', href: '/' },
        { label: 'Viewer Dashboard', current: true }
    ]

    const expiresAt = user?.expiresAt ? new Date(user.expiresAt) : null
    const timeUntilExpiry = expiresAt ? formatDistanceToNow(expiresAt, { addSuffix: true }) : null

    return (
        <div className="space-y-6">
            <BreadcrumbNav items={breadcrumbItems} />
            
            
            <Card>
                <CardHeader>
                    <CardTitle>Viewer Dashboard</CardTitle>
                    {/* <CardDescription>Viewer Dashboard</CardDescription> */}
                </CardHeader>
                <CardContent>
                    <p>Your temporary access will expire {timeUntilExpiry}. Please contact the administrator for continued access.</p>
                </CardContent>
            </Card>
        </div>
    )
}