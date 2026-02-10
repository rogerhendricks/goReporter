import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { CalendarPlus, ExternalLink, Loader2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {type Appointment, type AppointmentPayload } from '@/services/appointmentService'
import { AppointmentFormDialog } from '@/components/appointments/AppointmentFormDialog'
import { useAppointments } from '@/hooks/useAppointments'

interface PatientAppointmentsProps {
  patientId: number
  patientName: string
  isDoctor?: boolean
}

const statusVariantMap: Record<string, string> = {
  scheduled: 'bg-sky-100 text-sky-700 border border-sky-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 border border-rose-200',
}

export function PatientAppointments({ patientId, patientName, isDoctor = false }: PatientAppointmentsProps) {
  const { appointments, loading, createAppointment, updateAppointment, deleteAppointment } = useAppointments({
    patientId,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [activeAppointment, setActiveAppointment] = useState<Appointment | undefined>()

  const upcomingAppointments = useMemo(() => appointments.slice(0, 5), [appointments])

  const openCreate = () => {
    if (isDoctor) return
    setDialogMode('create')
    setActiveAppointment(undefined)
    setDialogOpen(true)
  }

  const openEdit = (appointment: Appointment) => {
    if (isDoctor) return
    setDialogMode('edit')
    setActiveAppointment(appointment)
    setDialogOpen(true)
  }

  const handleSubmit = (payload: AppointmentPayload) => {
    if (dialogMode === 'edit' && activeAppointment) {
      return updateAppointment(activeAppointment.id, payload)
    }
    return createAppointment(payload)
  }

  const handleDelete = activeAppointment
    ? () => deleteAppointment(activeAppointment.id)
    : undefined

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Appointments</CardTitle>
          <p className="text-sm text-muted-foreground">Schedule time with {patientName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to={`/appointments?patientId=${patientId}`} aria-label="Open calendar">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          {!isDoctor && (
            <Button variant="outline" size="sm" onClick={openCreate}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Schedule
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading appointments…
          </div>
        )}

        {!loading && upcomingAppointments.length === 0 && (
          <p className="text-sm text-muted-foreground">No appointments yet.</p>
        )}

        <div className="space-y-3">
          {upcomingAppointments.map(appointment => {
            const content = (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{appointment.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(appointment.startAt), 'MMM d, yyyy')} · {format(new Date(appointment.startAt), 'p')}
                    </p>
                  </div>
                  <Badge className={statusVariantMap[appointment.status] ?? ''}>{appointment.status}</Badge>
                </div>
                {appointment.location && <p className="text-xs text-muted-foreground">{appointment.location}</p>}
                {appointment.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{appointment.description}</p>
                )}
              </>
            )

            return isDoctor ? (
              <div key={appointment.id} className="w-full rounded-xl border p-3 text-left">
                {content}
              </div>
            ) : (
              <button
                key={appointment.id}
                type="button"
                onClick={() => openEdit(appointment)}
                className="w-full rounded-xl border p-3 text-left transition hover:border-primary/60"
              >
                {content}
              </button>
            )
          })}
        </div>
      </CardContent>

      {!isDoctor && (
        <AppointmentFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          appointment={activeAppointment}
          patientId={patientId}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      )}
    </Card>
  )
}
