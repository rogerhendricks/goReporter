import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, addWeeks, endOfWeek, startOfWeek } from 'date-fns'
import { AlertCircle, CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'

import { appointmentService } from '@/services/appointmentService'
import type { Appointment } from '@/services/appointmentService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TableSkeleton } from '@/components/ui/loading-skeletons'

const PAGE_SIZE = 10

export function UpcomingAppointmentsCard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const now = useMemo(() => new Date(), [])
  const windowStart = useMemo(() => startOfWeek(now, { weekStartsOn: 1 }), [now])
  const windowEnd = useMemo(
    () => endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }),
    [now]
  )

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await appointmentService.getAppointments({
          start: windowStart.toISOString(),
          end: windowEnd.toISOString(),
        })

        const upcoming = data
          .filter((appt) => new Date(appt.startAt) >= now)
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

        setAppointments(upcoming)
        setPage(1)
      } catch (err: any) {
        console.error('Failed to load appointments', err)
        setError(err?.response?.data?.error || 'Failed to load appointments')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [now, windowEnd, windowStart])

  const totalPages = Math.max(1, Math.ceil(appointments.length / PAGE_SIZE))
  const pageAppointments = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return appointments.slice(start, start + PAGE_SIZE)
  }, [appointments, page])

  const formatDateTime = (value: string) => {
    const date = new Date(value)
    return `${format(date, 'PP')} at ${format(date, 'p')}`
  }

  const renderContent = () => {
    if (loading && appointments.length === 0) {
      return <TableSkeleton rows={5} />
    }

    if (error) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (appointments.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <CalendarClock className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No upcoming appointments for the next two weeks</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">MRN</TableHead>
                <TableHead className="text-left">Patient</TableHead>
                <TableHead className="text-left">Appointment</TableHead>
                <TableHead className="text-left">Reports</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageAppointments.map((appt) => (
                <TableRow key={appt.id}>
                  <TableCell className="text-left">{appt.patient?.mrn ?? '—'}</TableCell>
                  <TableCell className="text-left">
                    {appt.patient ? (
                      <Link to={`/patients/${appt.patient.id}`} className="hover:underline font-medium">
                        {appt.patient.lname}, {appt.patient.fname}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="text-sm font-medium">{appt.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(appt.startAt)}</div>
                  </TableCell>
                  <TableCell className="text-left">
                    {appt.patient ? (
                      <Link to={`/patients/${appt.patient.id}/reports`} className="text-primary hover:underline text-sm">
                        Open Reports
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, appointments.length)} of {appointments.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
          </div>
        </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Upcoming Appointments
        </CardTitle>
        <CardDescription>
          Current and next week (Mon–Sun), limited to your patient panel
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  )
}
