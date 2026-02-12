import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, AlertCircle, Calendar, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/utils/axios'
import { TableSkeleton } from '@/components/ui/loading-skeletons'
import { Alert, AlertDescription } from '@/components/ui/alert'

type OverduePatient = {
  patientId: number
  firstName: string
  lastName: string
  mrn: number
  deviceType: string
  reportType: string
  lastReportDate: string | null
  daysSinceReport: number | null
  deviceSerial: string
  implantedDeviceId: number
}

type OverduePatientsResponse = {
  patients: OverduePatient[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function OverduePatientsCard() {
  const [data, setData] = useState<OverduePatientsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 10

  useEffect(() => {
    loadOverduePatients()
  }, [page])

  const loadOverduePatients = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get<OverduePatientsResponse>('/patients/overdue', {
        params: { page, limit }
      })
      setData(response.data)
    } catch (err: any) {
      console.error('Failed to load overdue patients:', err)
      setError(err.response?.data?.error || 'Failed to load overdue patients')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const getUrgencyBadge = (daysSinceReport: number | null, deviceType: string) => {
    if (daysSinceReport === null) {
      return <Badge variant="destructive">Never Reported</Badge>
    }

    const threshold = deviceType === 'defibrillator' ? 183 : 365 // 6 months vs 12 months
    const daysOverdue = daysSinceReport - threshold

    if (daysOverdue > 90) {
      return <Badge variant="destructive">Critical ({daysOverdue} days overdue)</Badge>
    } else if (daysOverdue > 30) {
      return <Badge variant="destructive">Urgent ({daysOverdue} days overdue)</Badge>
    } else {
      return <Badge variant="outline">Due ({daysOverdue} days overdue)</Badge>
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    return deviceType.toLowerCase() === 'defibrillator' ? '⚡' : '💓'
  }

  const getReportTypeIcon = (reportType: string) => {
    return reportType === 'In Clinic' ? <Calendar className="h-4 w-4" /> : <Activity className="h-4 w-4" />
  }

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Overdue Reports
          </CardTitle>
          <CardDescription>Patients requiring scheduled reports</CardDescription>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Overdue Reports
        </CardTitle>
        <CardDescription>
          Patients requiring scheduled reports based on device type
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {data && (!data.patients || data.patients.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No overdue patients found</p>
            <p className="text-sm">All patients are up to date with their reports!</p>
          </div>
        )}

        {data && data.patients && data.patients.length > 0 && (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Patient</TableHead>
                    <TableHead className="text-left">MRN</TableHead>
                    <TableHead className="text-left">Device</TableHead>
                    <TableHead className="text-left">Report Type</TableHead>
                    <TableHead className="text-left">Last Report</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.patients.map((patient) => (
                    <TableRow key={`${patient.patientId}-${patient.reportType}`}>
                      <TableCell className="text-left">{patient.mrn}</TableCell>
                      <TableCell className="font-medium text-left">
                        <Link 
                          to={`/patients/${patient.patientId}`}
                          className="hover:underline"
                        >
                          {patient.lastName}, {patient.firstName}
                        </Link>
                      </TableCell>

                      <TableCell className="text-left">
                        <div className="flex items-center gap-2">
                          <span>{getDeviceIcon(patient.deviceType)}</span>
                          <div>
                            <div className="text-sm capitalize">{patient.deviceType}</div>
                            <div className="text-xs text-muted-foreground">{patient.deviceSerial}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center gap-1">
                          {getReportTypeIcon(patient.reportType)}
                          <span className="text-sm">{patient.reportType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="text-sm">
                          {formatDate(patient.lastReportDate)}
                          {patient.daysSinceReport !== null && (
                            <div className="text-xs text-muted-foreground">
                              ({patient.daysSinceReport} days ago)
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        {getUrgencyBadge(patient.daysSinceReport, patient.deviceType)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total} overdue patients
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center px-3 text-sm">
                  Page {page} of {data.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= data.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
