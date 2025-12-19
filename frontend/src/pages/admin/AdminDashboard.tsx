import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { CheckSquare } from 'lucide-react'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { UserManagementTable } from '@/components/admin/UserManagementTable'
import { TagManagement } from '@/components/admin/TagManagement'
import { TaskTemplateManager } from '@/components/admin/TaskTemplateManager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import api from '@/utils/axios'
import { DonutChart } from '@/components/charts/DonutChart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TaskList } from '@/components/tasks/TaskList'
import { SecurityLogsDashboard } from '@/components/admin/SecurityLogManager'

type Slice = { label: string; count: number }
type ReportSummary = {
  total: number
  incomplete: number
  byStatus: Slice[]
}

type AnalyticsResponse = {
  byManufacturer: Slice[]
  byDeviceType: Slice[]
  reports: ReportSummary
}

type RecentReport = {
  id: number
  reportDate: string | Date
  reportType?: string | null
  reportStatus?: string | null
  patient?: {
    id: number
    fname?: string | null
    lname?: string | null
    mrn?: string | null
  } | null
  createdBy?: string | null
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentReports, setRecentReports] = useState<RecentReport[]>([])

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Admin Dashboard', current: true }
  ]

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [a, r] = await Promise.allSettled([
          api.get<AnalyticsResponse>('/analytics/summary'),
          api.get<RecentReport[]>('/reports/recent', { params: { limit: 10 } }),
        ])
        if (!mounted) return
        if (a.status === 'fulfilled') setData(a.value.data)
        if (r.status === 'fulfilled') setRecentReports(r.value.data || [])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // const adminActions = [
  //   {
  //     title: 'Manage Devices',
  //     description: 'Add, edit, and manage medical devices',
  //     icon: CircuitBoard,
  //     href: '/devices',
  //     createHref: '/devices/new'
  //   },
  //   {
  //     title: 'Manage Leads',
  //     description: 'Add, edit, and manage medical leads',
  //     icon: CircuitBoard,
  //     href: '/leads',
  //     createHref: '/leads/new'
  //   },
  //   {
  //     title: 'Manage Doctors',
  //     description: 'Add, edit, and manage doctor records',
  //     icon: Stethoscope,
  //     href: '/doctors',
  //     createHref: '/doctors/new'
  //   },
  //   {
  //     title: 'Manage Patients',
  //     description: 'Add, edit, and manage patient records',
  //     icon: Users,
  //     href: '/patients',
  //     createHref: '/patients/new'
  //   }
  // ]

  return (
    <div className="container py-6 mx-auto">
      <BreadcrumbNav items={breadcrumbItems} />

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">My Overview</TabsTrigger>
          <TabsTrigger value="admin">Admin Tools</TabsTrigger>
          <TabsTrigger value="management">User Management</TabsTrigger>
          <TabsTrigger value="security-logs">Security Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : !data ? (
            <div className="p-4 text-sm text-destructive">Failed to load analytics.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="md:mb-6">
                  <DonutChart title="Implants by Manufacturer" slices={data.byManufacturer} />
                </div>
                <div className="md:mb-6">
                  <DonutChart title="Implants by Device Type" slices={data.byDeviceType} />
                </div>
                <div className="flex items-center justify-between">
                  <Card>
                    <CardHeader>
                      <CardTitle>Reports Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 text-sm">
                        <span className="font-medium">Total:</span> {data.reports.total}{' '}
                        <span className="ml-4 font-medium">Waiting to complete:</span> {data.reports.incomplete}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-left">Status</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(data.reports.byStatus ?? []).map((s) => (
                            <TableRow key={s.label || 'Unknown'}>
                              <TableCell className="text-left">{s.label || 'Unknown'}</TableCell>
                              <TableCell className="text-right">{s.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentReports.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-left">MRN</TableHead>
                          <TableHead className="text-left">Patient</TableHead>
                          <TableHead className="text-left">Report Date</TableHead>
                          <TableHead className="text-left">Created By</TableHead>
                          <TableHead className="text-left">Status</TableHead>
                          <TableHead className="text-left">Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentReports.map((r) => {
                          const p = r.patient
                          const patientName = p ? [p.lname, p.fname].filter(Boolean).join(', ') : '—'
                          const mrn = p?.mrn || '—'
                          const createdBy = r.createdBy || '—'
                          const reportDateStr = r.reportDate ? new Date(r.reportDate).toLocaleDateString() : '—'

                          const patientCell = p?.id
                            ? (
                              <Link to={`/patients/${p.id}`} className="text-primary text-left hover:underline">
                                {patientName}
                              </Link>
                            )
                            : patientName

                          const reportDateCell = r.id
                            ? (
                              <Link to={`/reports/${r.id}/edit`} className="text-primary text-left hover:underline">
                                {reportDateStr}
                              </Link>
                            )
                            : reportDateStr
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="text-left">{mrn}</TableCell>
                              <TableCell className="text-left">{patientCell}</TableCell>
                              <TableCell className="text-left">{reportDateCell}</TableCell>
                              <TableCell className="text-left">{createdBy}</TableCell>
                              <TableCell className="text-left">{r.reportStatus || '—'}</TableCell>
                              <TableCell className="text-left">{r.reportType || '—'}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-muted-foreground">No recent reports.</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    My Assigned Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskList assignedToId={Number(user?.ID ?? 0)} showFilters={true} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="admin" className="space-y-6">
          <div>
            <TagManagement />
          </div>

          <div>
            <TaskTemplateManager />
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <div>
            <UserManagementTable />
          </div>

        </TabsContent>
          <TabsContent value="security-logs" className="space-y-6">
            <SecurityLogsDashboard />
          </TabsContent>
      </Tabs>
        <Card className="hover:shadow-lg transition-shadow mt-4">
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