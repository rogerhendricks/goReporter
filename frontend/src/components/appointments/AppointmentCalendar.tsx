import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Check, ChevronsUpDown, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { type Appointment, type AppointmentPayload, type AppointmentStatus } from '@/services/appointmentService'
import { AppointmentFormDialog, type PatientOption } from '@/components/appointments/AppointmentFormDialog'
import { useAppointments } from '@/hooks/useAppointments'
import { usePatientStore } from '@/stores/patientStore'
import { cn } from '@/lib/utils'

interface AppointmentCalendarProps {
  patientId?: number
}

const statusStyles: Record<AppointmentStatus, string> = {
  scheduled: 'bg-sky-100 text-sky-700 border border-sky-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 border border-rose-200',
}

const statusDotColors: Record<AppointmentStatus, string> = {
  scheduled: 'bg-sky-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-rose-500',
}

export function AppointmentCalendar({ patientId }: AppointmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterPatientId, setFilterPatientId] = useState<number | 'all'>(patientId ?? 'all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [activeAppointment, setActiveAppointment] = useState<Appointment | undefined>(undefined)
  const [dialogDate, setDialogDate] = useState<Date | undefined>(undefined)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterSearchQuery, setFilterSearchQuery] = useState('')
  const [appointmentPage, setAppointmentPage] = useState(1)
  const appointmentsPerPage = 5

  const {
    appointments,
    loading,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments({ autoLoad: false })

  const patients = usePatientStore(state => state.patients)
  const fetchPatients = usePatientStore(state => state.fetchPatients)
  const searchPatients = usePatientStore(state => state.searchPatients)
  const searchResults = usePatientStore(state => state.searchResults)

  useEffect(() => {
    if (!patients.length) {
      fetchPatients().catch(() => null)
    }
  }, [fetchPatients, patients.length])

  useEffect(() => {
    const monthStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const monthEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    const scopedPatient = filterPatientId === 'all' ? undefined : filterPatientId
    fetchAppointments({ start: monthStart, end: monthEnd }, scopedPatient)
  }, [currentMonth, filterPatientId, fetchAppointments])

  // Debounced filter search
  useEffect(() => {
    if (filterSearchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchPatients(filterSearchQuery)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [filterSearchQuery, searchPatients])

  const daysInView = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const filteredAppointments = useMemo(() => {
    if (filterPatientId === 'all') return appointments
    return appointments.filter(appt => appt.patientId === filterPatientId)
  }, [appointments, filterPatientId])

  const appointmentsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    filteredAppointments.forEach(appt => {
      const key = format(new Date(appt.startAt), 'yyyy-MM-dd')
      map[key] = map[key] ? [...map[key], appt] : [appt]
    })
    return map
  }, [filteredAppointments])

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')
  const selectedDayAppointments = appointmentsByDay[selectedDateKey] || []

  const totalAppointmentPages = Math.ceil(selectedDayAppointments.length / appointmentsPerPage)
  const paginatedAppointments = useMemo(() => {
    const startIndex = (appointmentPage - 1) * appointmentsPerPage
    const endIndex = startIndex + appointmentsPerPage
    return selectedDayAppointments.slice(startIndex, endIndex)
  }, [selectedDayAppointments, appointmentPage, appointmentsPerPage])

  // Reset pagination when date changes
  useEffect(() => {
    setAppointmentPage(1)
  }, [selectedDateKey])

  const patientOptions: PatientOption[] = useMemo(() => {
    const mapped = patients.map(patient => ({
      id: patient.id,
      label: `${patient.fname} ${patient.lname} · MRN ${patient.mrn}`,
    }))

    const focusId = (filterPatientId === 'all' ? undefined : filterPatientId) ?? patientId
    if (focusId && !mapped.find(option => option.id === focusId)) {
      mapped.push({ id: focusId, label: `Patient #${focusId}` })
    }

    return mapped
  }, [patients, filterPatientId, patientId])

  const selectedFilterLabel = useMemo(() => {
    if (filterPatientId === 'all') return 'All patients'
    const patient = patients.find(p => p.id === filterPatientId)
    if (patient) {
      return `${patient.fname} ${patient.lname}`
    }
    return `Patient #${filterPatientId}`
  }, [filterPatientId, patients])

  const handleFilterSelect = (selectedId: number | 'all') => {
    setFilterPatientId(selectedId)
    setFilterOpen(false)
    setFilterSearchQuery('')
  }

  const openCreateDialog = (date?: Date) => {
    setDialogMode('create')
    setActiveAppointment(undefined)
    setDialogDate(date)
    setDialogOpen(true)
  }

  const openEditDialog = (appointment: Appointment) => {
    setDialogMode('edit')
    setActiveAppointment(appointment)
    setDialogDate(new Date(appointment.startAt))
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Plan in-person and remote visits</p>
          <div className="flex items-center gap-3 text-xl font-semibold">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>{format(currentMonth, 'MMMM yyyy')}</span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={filterOpen}
                className="w-[220px] justify-between"
              >
                {selectedFilterLabel}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder="Search patients..." 
                  value={filterSearchQuery}
                  onValueChange={setFilterSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>
                    {filterSearchQuery.length < 2 
                      ? "Type to search patients"
                      : "No patients found"
                    }
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => handleFilterSelect('all')}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full" onPointerDown={(e) => {
                        e.preventDefault()
                        handleFilterSelect('all')
                      }}>
                        <Check
                          className={cn(
                            "h-4 w-4",
                            filterPatientId === 'all' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>All patients</span>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                  {filterSearchQuery.length >= 2 && searchResults.length > 0 && (
                    <CommandGroup heading="Search Results">
                      {searchResults.slice(0, 50).map((patient) => (
                        <CommandItem
                          key={patient.id}
                          value={String(patient.id)}
                          onSelect={() => handleFilterSelect(patient.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start gap-2 w-full" onPointerDown={(e) => {
                            e.preventDefault()
                            handleFilterSelect(patient.id)
                          }}>
                            <Check
                              className={cn(
                                "h-4 w-4 mt-0.5 shrink-0",
                                filterPatientId === patient.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm">{patient.fname} {patient.lname}</span>
                              <span className="text-xs text-muted-foreground">
                                MRN {patient.mrn}
                              </span>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {filterSearchQuery.length === 0 && patients.length > 0 && (
                    <CommandGroup heading="Recent Patients">
                      {patients.slice(0, 10).map((patient) => (
                        <CommandItem
                          key={patient.id}
                          value={String(patient.id)}
                          onSelect={() => handleFilterSelect(patient.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start gap-2 w-full" onPointerDown={(e) => {
                            e.preventDefault()
                            handleFilterSelect(patient.id)
                          }}>
                            <Check
                              className={cn(
                                "h-4 w-4 mt-0.5 shrink-0",
                                filterPatientId === patient.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm">{patient.fname} {patient.lname}</span>
                              <span className="text-xs text-muted-foreground">
                                MRN {patient.mrn}
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
          {filterPatientId !== 'all' && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleFilterSelect('all')}
              className="h-10 w-10"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear filter</span>
            </Button>
          )}
          <Button onClick={() => openCreateDialog(selectedDate)}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {daysInView.map(day => {
                const key = format(day, 'yyyy-MM-dd')
                const dayAppointments = appointmentsByDay[key] || []
                const isSelected = isSameDay(day, selectedDate)
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'min-h-[100px] rounded-xl border p-2 text-left transition hover:border-primary/50 hover:shadow-sm',
                      !isSameMonth(day, currentMonth) && 'opacity-40',
                      isSelected && 'border-primary shadow'
                    )}
                  >
                    <div className="flex items-center justify-between text-sm font-medium mb-2">
                      <span>{format(day, 'd')}</span>
                      {isToday(day) && (
                        <span className="text-xs font-semibold text-primary">Today</span>
                      )}
                    </div>
                    {dayAppointments.length > 0 && (
                      <div className="space-y-1">
                        {/* Group clinic appointments by time slot */}
                        {(() => {
                          const clinicAppts = dayAppointments.filter(a => a.location === 'clinic')
                          const otherAppts = dayAppointments.filter(a => a.location !== 'clinic')
                          
                          // Group clinic appointments by rounded time (15-min slots)
                          const slotGroups: Record<string, Appointment[]> = {}
                          clinicAppts.forEach(appt => {
                            const date = new Date(appt.startAt)
                            const minutes = date.getMinutes()
                            const roundedMinutes = Math.floor(minutes / 15) * 15
                            date.setMinutes(roundedMinutes, 0, 0)
                            const slotKey = format(date, 'HH:mm')
                            slotGroups[slotKey] = slotGroups[slotKey] || []
                            slotGroups[slotKey].push(appt)
                          })

                          return (
                            <>
                              {/* Show clinic slot indicators */}
                              {Object.entries(slotGroups).map(([time, appts]) => (
                                <div key={time} className="flex items-center gap-1 text-[10px]">
                                  <span className="text-muted-foreground min-w-[32px]">{time}</span>
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                      <div
                                        key={i}
                                        className={cn(
                                          'w-1.5 h-1.5 rounded-full',
                                          i < appts.length ? 'bg-sky-500' : 'bg-gray-200'
                                        )}
                                        title={i < appts.length ? appts[i].title : 'Available'}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Show other appointment dots as before */}
                              {otherAppts.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {otherAppts.map((appt) => (
                                    <div
                                      key={appt.id}
                                      className={cn(
                                        'h-2 w-2 rounded-full',
                                        statusDotColors[appt.status]
                                      )}
                                      title={`${format(new Date(appt.startAt), 'p')} - ${appt.title} (${appt.status})`}
                                    />
                                  ))}
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {loading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Syncing schedule…
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>{format(selectedDate, 'EEEE, MMM d')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedDayAppointments.length} appointment{selectedDayAppointments.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => openCreateDialog(selectedDate)}>
              <CalendarDays className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent>
            {selectedDayAppointments.length === 0 && (
              <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
            )}
            <div className="space-y-2">
              {paginatedAppointments.map(appt => (
                <div
                  key={appt.id}
                  className="cursor-pointer rounded-lg border p-2.5 hover:border-primary transition-colors"
                  onClick={() => openEditDialog(appt)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{appt.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appt.startAt), 'p')}
                        {appt.endAt && ` – ${format(new Date(appt.endAt), 'p')}`}
                      </p>
                    </div>
                    <Badge className={cn(statusStyles[appt.status], 'shrink-0 text-xs')}>
                      {appt.status}
                    </Badge>
                    {appt.location && (
                      <Badge className={cn(statusStyles[appt.status], 'shrink-0 text-xs')}>
                        {appt.location}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      {appt.patient?.fname ? `${appt.patient.fname} ${appt.patient.lname}` : `Patient #${appt.patientId}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {totalAppointmentPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  Page {appointmentPage} of {totalAppointmentPages}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAppointmentPage(p => Math.max(1, p - 1))}
                    disabled={appointmentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAppointmentPage(p => Math.min(totalAppointmentPages, p + 1))}
                    disabled={appointmentPage === totalAppointmentPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AppointmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        appointment={activeAppointment}
        patientId={patientId ?? (filterPatientId === 'all' ? undefined : filterPatientId)}
        patients={patientOptions}
        defaultDate={dialogDate ?? selectedDate}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </div>
  )
}
