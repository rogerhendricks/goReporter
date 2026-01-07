import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  type Appointment,
  type AppointmentPayload,
  appointmentService,
  type AppointmentQueryParams,
} from '@/services/appointmentService'

interface DateRangeOption {
  start?: Date
  end?: Date
}

interface UseAppointmentsOptions {
  patientId?: number
  autoLoad?: boolean
}

interface ActiveRange {
  start?: string
  end?: string
}

const sortByStart = (a: Appointment, b: Appointment) =>
  new Date(a.startAt).getTime() - new Date(b.startAt).getTime()

const toISO = (date?: Date) => (date ? date.toISOString() : undefined)

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const { patientId, autoLoad = true } = options
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeRange = useRef<ActiveRange>({})

  const fetchAppointments = useCallback(
    async (range?: DateRangeOption, overridePatientId?: number) => {
      setLoading(true)
      setError(null)
      const params: AppointmentQueryParams = {}

      const effectivePatientId = typeof overridePatientId === 'number' ? overridePatientId : patientId

      if (!patientId && effectivePatientId) {
        params.patientId = effectivePatientId
      }

      if (range?.start) {
        params.start = toISO(range.start)
        activeRange.current.start = params.start
      } else if (activeRange.current.start) {
        params.start = activeRange.current.start
      }

      if (range?.end) {
        params.end = toISO(range.end)
        activeRange.current.end = params.end
      } else if (activeRange.current.end) {
        params.end = activeRange.current.end
      }

      try {
        let data: Appointment[]
        if (patientId) {
          data = await appointmentService.getPatientAppointments(patientId)
        } else {
          data = await appointmentService.getAppointments(params)
        }
        setAppointments(data.sort(sortByStart))
      } catch (err) {
        console.error('Failed to load appointments', err)
        setError('Failed to load appointments')
        toast.error('Unable to load appointments')
      } finally {
        setLoading(false)
      }
    },
    [patientId]
  )

  const createAppointment = useCallback(
    async (payload: AppointmentPayload) => {
      try {
        const data = await appointmentService.createAppointment(payload)
        setAppointments(prev => [...prev, data].sort(sortByStart))
        toast.success('Appointment scheduled')
        return data
      } catch (err) {
        console.error('Failed to create appointment', err)
        toast.error('Unable to create appointment')
        throw err
      }
    },
    []
  )

  const updateAppointment = useCallback(
    async (id: number, payload: Partial<AppointmentPayload>) => {
      try {
        const data = await appointmentService.updateAppointment(id, payload)
        setAppointments(prev => prev.map(appt => (appt.id === id ? data : appt)).sort(sortByStart))
        toast.success('Appointment updated')
        return data
      } catch (err) {
        console.error('Failed to update appointment', err)
        toast.error('Unable to update appointment')
        throw err
      }
    },
    []
  )

  const deleteAppointment = useCallback(async (id: number) => {
    try {
      await appointmentService.deleteAppointment(id)
      setAppointments(prev => prev.filter(appt => appt.id !== id))
      toast.success('Appointment deleted')
    } catch (err) {
      console.error('Failed to delete appointment', err)
      toast.error('Unable to delete appointment')
      throw err
    }
  }, [])

  useEffect(() => {
    if (autoLoad) {
      fetchAppointments()
    }
  }, [autoLoad, fetchAppointments, patientId])

  return {
    appointments,
    loading,
    error,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  }
}
