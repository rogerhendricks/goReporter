import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { AppointmentCalendar } from '@/components/appointments/AppointmentCalendar'

export default function AppointmentCalendarPage() {
  const [search] = useSearchParams()
  const patientId = useMemo(() => {
    const value = search.get('patientId')
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }, [search])

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Appointment Calendar</h1>
        <p className="text-muted-foreground">Coordinate clinic visits, remote checks, and follow-ups.</p>
      </div>
      <AppointmentCalendar patientId={patientId} />
    </div>
  )
}
