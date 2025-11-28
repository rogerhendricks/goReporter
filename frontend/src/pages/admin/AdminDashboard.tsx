import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Users, Stethoscope, CircuitBoard, Plus } from 'lucide-react'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { UserManagementTable } from '@/components/admin/UserManagementTable'
import { TagManagement } from '@/components/admin/TagManagement'
import { TaskTemplateManager } from '@/components/admin/TaskTemplateManager'

export default function AdminDashboard() {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Admin Dashboard', current: true }
  ]

  const adminActions = [
    {
      title: 'Manage Devices',
      description: 'Add, edit, and manage medical devices',
      icon: CircuitBoard,
      href: '/devices',
      createHref: '/devices/new'
    },
    {
      title: 'Manage Leads',
      description: 'Add, edit, and manage medical leads',
      icon: CircuitBoard,
      href: '/leads',
      createHref: '/leads/new'
    },
    {
      title: 'Manage Doctors',
      description: 'Add, edit, and manage doctor records',
      icon: Stethoscope,
      href: '/doctors',
      createHref: '/doctors/new'
    },
    {
      title: 'Manage Patients',
      description: 'Add, edit, and manage patient records',
      icon: Users,
      href: '/patients',
      createHref: '/patients/new'
    }
  ]

  return (
<<<<<<< HEAD
    <div className="container py-6 mx-auto">
=======
    <div className="container mx-auto py-6">
>>>>>>> 4a0adce0a132bfc0f8219adc7fa224d7b7866bae
      <BreadcrumbNav items={breadcrumbItems} />
      
      <div className="flex flex-col space-y-4 pb-2">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage system resources and configurations. As an admin, you have full access to all features.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {adminActions.map((action) => {
          const Icon = action.icon
          return (
            <Card key={action.title} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {action.title}
                </CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button asChild>
                    <Link to={action.href}>View All</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={action.createHref} className="flex items-center gap-1">
                      <Plus className="h-4 w-4" />
                      Create New
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className="my-6">
        <UserManagementTable />
      </div>

      <div className="my-6">
      <TagManagement />
      </div>

<<<<<<< HEAD
      <div className="my-6">
        <TaskTemplateManager />
      </div>
      <Card>
=======
      <Card className="hover:shadow-lg transition-shadow mt-6">
>>>>>>> 4a0adce0a132bfc0f8219adc7fa224d7b7866bae
        <CardHeader>
          <CardTitle>Admin Privileges</CardTitle>
          <CardDescription>
            Your admin account has the following capabilities:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-left">
            <li>Create, update and delete all patient records</li>
            <li>Manage doctor accounts and assignments</li>
            <li>Configure medical devices and leads</li>
            <li>Access all reports and data across the system</li>
            <li>Manage system users and their roles</li>
            <li>Create, update and delete tags for categorization</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}