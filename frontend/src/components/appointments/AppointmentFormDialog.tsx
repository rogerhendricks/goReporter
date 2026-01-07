import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Appointment, type AppointmentPayload, type AppointmentStatus } from '@/services/appointmentService'

export interface PatientOption {
  id: number
  label: string
}

interface AppointmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'create' | 'edit'
  appointment?: Appointment
  defaultDate?: Date
  patientId?: number
  patients?: PatientOption[]
  onSubmit: (payload: AppointmentPayload) => Promise<any>
  onDelete?: () => Promise<any>
}

interface FormState {
  title: string
  description: string
  location: string
  status: AppointmentStatus
  startAt: string
  endAt: string
  patientId: number
}

const statusOptions: { label: string; value: AppointmentStatus }[] = [
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

const formatDateTimeLocal = (value?: string | Date): string => {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

const buildInitialState = (
  appointment?: Appointment,
  patientId?: number,
  defaultDate?: Date
): FormState => ({
  title: appointment?.title ?? '',
  description: appointment?.description ?? '',
  location: appointment?.location ?? '',
  status: appointment?.status ?? 'scheduled',
  startAt: formatDateTimeLocal(appointment?.startAt ?? defaultDate ?? new Date()),
  endAt: formatDateTimeLocal(appointment?.endAt ?? undefined),
  patientId: appointment?.patientId ?? patientId ?? 0,
})

export function AppointmentFormDialog(props: AppointmentFormDialogProps) {
  const {
    open,
    onOpenChange,
    mode = 'create',
    appointment,
    patientId,
    patients = [],
    onSubmit,
    onDelete,
    defaultDate,
  } = props

  const [formState, setFormState] = useState<FormState>(() => buildInitialState(appointment, patientId, defaultDate))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFormState(buildInitialState(appointment, patientId, defaultDate))
      setFormError(null)
      setSubmitting(false)
    }
  }, [open, appointment, patientId, defaultDate])

  const patientOptions = useMemo(() => {
    if (patientId && !patients.find(p => p.id === patientId)) {
      return [...patients, { id: patientId, label: 'Selected Patient' }]
    }
    return patients
  }, [patientId, patients])

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState(prev => ({ ...prev, [key]: value }))
  }

  const handlePatientChange = (value: string) => {
    setFormState(prev => ({ ...prev, patientId: Number(value) }))
  }

  const handleSubmit = async () => {
    const targetPatientId = patientId ?? formState.patientId
    if (!formState.title.trim()) {
      setFormError('Title is required')
      return
    }
    if (!formState.startAt) {
      setFormError('Start date/time is required')
      return
    }
    if (!targetPatientId) {
      setFormError('Please select a patient')
      return
    }

    setFormError(null)
    setSubmitting(true)

    const payload: AppointmentPayload = {
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      location: formState.location.trim() || undefined,
      status: formState.status,
      startAt: new Date(formState.startAt).toISOString(),
      endAt: formState.endAt ? new Date(formState.endAt).toISOString() : undefined,
      patientId: targetPatientId,
    }

    try {
      await onSubmit(payload)
      onOpenChange(false)
    } catch (err) {
      setFormError('Unable to save appointment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setSubmitting(true)
    try {
      await onDelete()
      onOpenChange(false)
    } catch (err) {
      setFormError('Unable to delete appointment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Schedule Appointment' : 'Edit Appointment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {formError && <p className="text-sm text-destructive">{formError}</p>}

          {!patientId && (
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select
                value={formState.patientId ? String(formState.patientId) : ''}
                onValueChange={handlePatientChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {patientOptions.map(option => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formState.title}
              onChange={event => handleChange('title', event.target.value)}
              placeholder="Remote check in"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea
              id="description"
              value={formState.description}
              onChange={event => handleChange('description', event.target.value)}
              placeholder="Add optional visit context"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formState.location}
              onChange={event => handleChange('location', event.target.value)}
              placeholder="Clinic A — Room 5"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={formState.startAt}
                onChange={event => handleChange('startAt', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input
                type="datetime-local"
                value={formState.endAt}
                onChange={event => handleChange('endAt', event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formState.status} onValueChange={value => handleChange('status', value as AppointmentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {onDelete && mode === 'edit' && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={submitting}>
                Delete
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : mode === 'create' ? 'Schedule' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
