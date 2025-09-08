import { useEffect, useState } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { useAuthStore } from '@/stores/authStore'
// import { Button } from "@/components/ui/button"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
// import { Users } from 'lucide-react'
import api from '@/utils/axios'
import { DonutChart } from '@/components/charts/DonutChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from 'react-router-dom' 

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

export default function Home() {
  // const navigate = useNavigate()
  // const { user, logout } = useAuthStore()
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
const [recentReports, setRecentReports] = useState<RecentReport[]>([])

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

  // useEffect(() => {
  //   let mounted = true
  //   ;(async () => {
  //     try {
  //       const res = await api.get<AnalyticsResponse>('/analytics/summary')
  //       if (mounted) setData(res.data)
  //     } finally {
  //       if (mounted) setLoading(false)
  //     }
  //   })()
  //   return () => { mounted = false }
  // }, [])
  
  // const handleLogout = async () => {
  //   await logout()
  //   navigate('/login', { replace: true })
  // }
  
  const breadcrumbItems = [
    { label: 'Home', current: true }
  ]
  
  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading…</div>
  }
  if (!data) {
    return <div className="p-4 text-sm text-destructive">Failed to load analytics.</div>
  }
  return (
    <div className="container mx-auto py-6">
      <div className="p-4 space-y-6">
        <BreadcrumbNav items={breadcrumbItems} />
      </div>
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
                    {data.reports.byStatus.map((s) => (
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
        <div className="mt-6">
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
        </div>
    </div>  
  )
}