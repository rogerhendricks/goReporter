import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Check, ChevronsUpDown } from 'lucide-react'

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { SlotPicker } from './SlotPicker'
import {
  type Appointment,
  type AppointmentPayload,
  type AppointmentStatus,
  type AppointmentLocation,
  type AppointmentSlot,
  appointmentService,
} from '@/services/appointmentService'
import { usePatientStore } from '@/stores/patientStore'

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
  location: AppointmentLocation
  status: AppointmentStatus
  startAt: string
  patientId: number
}

const statusOptions: { label: string; value: AppointmentStatus }[] = [
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Arrived', value: 'arrived' },
  { label: 'Cancelled', value: 'cancelled' },
]

const locationOptions: { label: string; value: AppointmentLocation }[] = [
  { label: 'Remote', value: 'remote' },
  { label: 'Televisit', value: 'televisit' },
  { label: 'Clinic', value: 'clinic' },
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
  location: appointment?.location ?? 'clinic',
  status: appointment?.status ?? 'scheduled',
  startAt: formatDateTimeLocal(appointment?.startAt ?? defaultDate ?? new Date()),
  patientId: appointment?.patientId ?? patientId ?? 0,
})

export function AppointmentFormDialog(props: AppointmentFormDialogProps) {
  const {
    open,
    onOpenChange,
    mode = 'create',
    appointment,
    patientId,
    onSubmit,
    onDelete,
    defaultDate,
  } = props

  const [formState, setFormState] = useState<FormState>(() => buildInitialState(appointment, patientId, defaultDate))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')

  const { patients: allPatients, searchPatients, searchResults } = usePatientStore()

  // Get patient name when patientId is provided
  const selectedPatient = useMemo(() => {
    if (!formState.patientId) return null
    
    // First check appointment patient data
    if (appointment?.patient) {
      return `${appointment.patient.fname || ''} ${appointment.patient.lname || ''}`.trim() || 
             `Patient #${appointment.patient.id}`
    }
    
    // Then check all patients
    const patient = allPatients.find(p => p.id === formState.patientId)
    if (patient) {
      return `${patient.fname} ${patient.lname} · MRN ${patient.mrn}`
    }
    
    // Check search results
    const searchPatient = searchResults.find(p => p.id === formState.patientId)
    if (searchPatient) {
      return `${searchPatient.fname} ${searchPatient.lname} · MRN ${searchPatient.mrn}`
    }
    
    return `Patient #${formState.patientId}`
  }, [formState.patientId, appointment, allPatients, searchResults])

  useEffect(() => {
    if (open) {
      setFormState(buildInitialState(appointment, patientId, defaultDate))
      setFormError(null)
      setSubmitting(false)
      setSearchQuery('')
      setAvailableSlots([])
      setSelectedDate('')
    }
  }, [open, appointment, patientId, defaultDate])

  // Debounced search
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchPatients(searchQuery)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchQuery, searchPatients])

  // Fetch available slots when clinic location and date are selected
  useEffect(() => {
    const fetchSlots = async () => {
      if (formState.location !== 'clinic' || !formState.startAt) {
        setAvailableSlots([])
        setSelectedDate('')
        return
      }

      const startDate = new Date(formState.startAt)
      if (isNaN(startDate.getTime())) {
        setAvailableSlots([])
        return
      }

      const dateStr = startDate.toISOString().split('T')[0]
      if (dateStr === selectedDate && availableSlots.length > 0) return // Already loaded for this date

      setSelectedDate(dateStr)
      setLoadingSlots(true)

      try {
        // Fetch slots for 8:00 AM - 11:30 AM window in user's local timezone
        const startOfWindow = new Date(startDate)
        startOfWindow.setHours(8, 0, 0, 0)
        
        const endOfWindow = new Date(startDate)
        endOfWindow.setHours(11, 30, 59, 999)
        
        const slots = await appointmentService.getAvailableSlots({
          start: startOfWindow.toISOString(),
          end: endOfWindow.toISOString(),
          location: 'clinic',
        })
        setAvailableSlots(slots)
      } catch (error) {
        console.error('Failed to load slots:', error)
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [formState.location, formState.startAt])

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState(prev => ({ ...prev, [key]: value }))
  }

  const handleStartTimeChange = (value: string) => {
    if (formState.location === 'clinic' && value) {
      // Round to nearest 15-minute slot for clinic appointments
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        const minutes = date.getMinutes()
        const roundedMinutes = Math.floor(minutes / 15) * 15
        date.setMinutes(roundedMinutes, 0, 0)
        const rounded = format(date, "yyyy-MM-dd'T'HH:mm")
        setFormState(prev => ({ ...prev, startAt: rounded }))
        return
      }
    }
    setFormState(prev => ({ ...prev, startAt: value }))
  }

  const handleLocationChange = (value: AppointmentLocation) => {
    setFormState(prev => {
      const newState = { ...prev, location: value }
      if (value === 'clinic' && prev.startAt) {
        // Round to nearest 15-minute slot
        const date = new Date(prev.startAt)
        const minutes = date.getMinutes()
        const roundedMinutes = Math.floor(minutes / 15) * 15
        date.setMinutes(roundedMinutes, 0, 0)
        const rounded = format(date, "yyyy-MM-dd'T'HH:mm")
        newState.startAt = rounded
      }
      return newState
    })
  }

  const handlePatientSelect = (selectedPatientId: number) => {
    setFormState(prev => ({ ...prev, patientId: selectedPatientId }))
    setSearchOpen(false)
    setSearchQuery('')
  }

  const handleSlotSelect = (slotTime: string) => {
    // Convert UTC slot time to local datetime-local format
    const date = new Date(slotTime)
    const formatted = format(date, "yyyy-MM-dd'T'HH:mm")
    setFormState(prev => ({ ...prev, startAt: formatted }))
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

    // Calculate end time as 15 minutes after start time
    const startDate = new Date(formState.startAt)
    const endDate = new Date(startDate.getTime() + 15 * 60 * 1000) // Add 15 minutes

    const payload: AppointmentPayload = {
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      location: formState.location,
      status: formState.status,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      patientId: targetPatientId,
    }

    try {
      await onSubmit(payload)
      onOpenChange(false)
    } catch (err: any) {
      if (err?.response?.data?.code === 'INVALID_TIME') {
        setFormError('Clinic appointments are only available between 8:00 AM and 11:30 AM (Sydney time)')
      } else if (err?.response?.data?.code === 'SLOT_FULL') {
        setFormError('This time slot is full. Please select a different time.')
      } else if (err?.response?.data?.code === 'SLOT_BOOKING_FAILED') {
        setFormError('Failed to reserve slot. It may have just been filled by another user.')
      } else {
        setFormError('Unable to save appointment')
      }
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

          {!patientId ? (
            <div className="space-y-2">
              <Label>Patient</Label>
              <Popover open={searchOpen} onOpenChange={setSearchOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={searchOpen}
                    className="w-full justify-between"
                  >
                    {selectedPatient || "Select patient..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search by name or MRN..." 
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty className="p-2 text-sm text-muted-foreground">
                        {searchQuery.length < 2 
                          ? "Type at least 2 characters to search"
                          : "No patients found"
                        }
                      </CommandEmpty>
                      {searchQuery.length >= 2 && searchResults.length > 0 && (
                        <CommandGroup heading="Search Results">
                          {searchResults.slice(0, 50).map((patient) => (
                            <CommandItem
                              key={patient.id}
                              value={String(patient.id)}
                              onSelect={() => handlePatientSelect(patient.id)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-start gap-2 w-full" onPointerDown={(e) => {
                                e.preventDefault()
                                handlePatientSelect(patient.id)
                              }}>
                                <Check
                                  className={cn(
                                    "h-4 w-4 mt-0.5 shrink-0",
                                    formState.patientId === patient.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span>{patient.fname} {patient.lname}</span>
                                  <span className="text-xs text-muted-foreground">
                                    MRN {patient.mrn} · DOB {patient.dob}
                                  </span>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Patient</Label>
              <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                {selectedPatient}
              </div>
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
            <Select value={formState.location} onValueChange={handleLocationChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.location === 'clinic' && (
              <p className="text-xs text-muted-foreground">
                Clinic appointments use 15-minute time slots with max 4 patients per slot
              </p>
            )}
          </div>

          {/* Slot picker for clinic appointments */}
          {formState.location === 'clinic' && formState.startAt && (
            <div className="space-y-2">
              <Label>Available Time Slots</Label>
              {loadingSlots ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Loading available slots...
                </div>
              ) : (
                <SlotPicker
                  slots={availableSlots}
                  selectedTime={formState.startAt}
                  onSelectSlot={handleSlotSelect}
                  disabled={submitting}
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Start Date & Time</Label>
            <Input
              type="datetime-local"
              value={formState.startAt}
              onChange={event => handleStartTimeChange(event.target.value)}
              step={formState.location === 'clinic' ? 900 : 60}
            />
            <p className="text-xs text-muted-foreground">
              Appointment duration: 15 minutes
            </p>
            {formState.location === 'clinic' && loadingSlots && (
              <p className="text-xs text-muted-foreground">Loading available slots...</p>
            )}
            {formState.location === 'clinic' && !loadingSlots && formState.startAt && Array.isArray(availableSlots) && (() => {
                // Round the selected time to nearest 15 minutes for comparison
                const selectedDate = new Date(formState.startAt)
                const minutes = selectedDate.getMinutes()
                const roundedMinutes = Math.floor(minutes / 15) * 15
                selectedDate.setMinutes(roundedMinutes, 0, 0)
                
                // Find matching slot by comparing timestamps
                const slot = availableSlots.find(s => {
                  const slotDate = new Date(s.slotTime)
                  return Math.abs(slotDate.getTime() - selectedDate.getTime()) < 1000
                })
                
                if (slot) {
                  return (
                    <p className={cn(
                      "text-xs font-medium",
                      slot.remaining > 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {slot.remaining > 0 
                        ? `${slot.remaining} of ${slot.total} slots available`
                        : 'This time slot is full'
                      }
                    </p>
                  )
                }
                
                // No slot found means it's a new time slot (all 4 available)
                return (
                  <p className="text-xs font-medium text-emerald-600">
                    4 of 4 slots available (new time slot)
                  </p>
                )
              })()}
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
