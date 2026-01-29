import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'


export default function ViewerDashboard() {
    const breadcrumbItems = [
        { label: 'Home', href: '/' },
        { label: 'Viewer Dashboard', current: true }
    ]

    return (
        <div className="space-y-6">
            <BreadcrumbNav items={breadcrumbItems} />
            <Card>
                <CardHeader>
                    <CardTitle>Viewer Dashboard</CardTitle>
                    <CardDescription>Viewer Dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                    <h1>Viewer Dashboard</h1>
                </CardContent>
            </Card>
        </div>
    )
}