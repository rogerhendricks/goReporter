import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/stores/taskStore'
import type { TaskStatus, TaskPriority, Task, DueDateFilter } from '@/stores/taskStore'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { taskTemplateService, type TaskTemplate } from '@/services/taskTemplateService'
import { usePatientStore } from '@/stores/patientStore'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, CheckCircle2, Circle, Clock, User, Users, AlertCircle, Plus, Eye, Trash2, HelpCircle, X, Search, XCircle } from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { CardSkeleton } from '@/components/ui/loading-skeletons'
import {
  findPatientsBySerialNumbers,
  parseSerialNumbers,
  assignTemplateToPatients,
  type SerialNumberMatch
} from '@/utils/serialNumberMatcher'
import { cn } from '@/lib/utils'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { useTeamStore } from '@/stores/teamStore'
import type { Team } from '@/services/teamService'
// import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { TaskForm } from '@/components/forms/TaskForm'

interface TaskListProps {
  patientId?: number
  assignedToId?: number
  showFilters?: boolean
}

const priorityConfig: Record<TaskPriority, { color: string; label: string; icon: typeof Circle }> = {
  low: { color: 'bg-blue-500', label: 'Low', icon: Circle },
  medium: { color: 'bg-yellow-500', label: 'Medium', icon: Circle },
  high: { color: 'bg-orange-500', label: 'High', icon: AlertCircle },
  urgent: { color: 'bg-red-500', label: 'Urgent', icon: AlertCircle }
}

const statusConfig: Record<TaskStatus, { color: string; label: string; icon: typeof Circle }> = {
  pending: { color: 'bg-gray-500', label: 'Pending', icon: Circle },
  in_progress: { color: 'bg-blue-500', label: 'In Progress', icon: Clock },
  completed: { color: 'bg-green-500', label: 'Completed', icon: CheckCircle2 },
  cancelled: { color: 'bg-red-500', label: 'Cancelled', icon: Circle }
}

export function TaskList({ patientId, assignedToId, showFilters = true }: TaskListProps) {
  const navigate = useNavigate()
  const { tasks, fetchTasks, fetchTasksByPatient, updateTask, deleteTask, isLoading } = useTaskStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const { users, fetchUsers } = useUserStore()
  const { teams, fetchTeams } = useTeamStore()
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>('all')
  const [openTemplateDialog, setOpenTemplateDialog] = useState(false)
  const [openNewTaskDialog, setOpenNewTaskDialog] = useState(false)
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [selectedPatients, setSelectedPatients] = useState<number[]>([])
  const [selectedPatientObjects, setSelectedPatientObjects] = useState<any[]>([])
  const [templateDueDate, setTemplateDueDate] = useState<Date | undefined>()
  const [isAssigning, setIsAssigning] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [openPatientSearch, setOpenPatientSearch] = useState(false)
  const [assignmentTab, setAssignmentTab] = useState<'browse' | 'serial'>('browse')
  const [serialNumberText, setSerialNumberText] = useState('')
  const [serialMatches, setSerialMatches] = useState<SerialNumberMatch[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { patients, fetchPatients, searchPatients } = usePatientStore()

  // Load data when template dialog opens, not on mount
  useEffect(() => {
    if (isAdmin && openTemplateDialog && templates.length === 0) {
      const loadData = async () => {
        try {
          await fetchUsers()
          const templatesData = await taskTemplateService.getAll()
          setTemplates(templatesData)
          await fetchPatients()
        } catch (error) {
          console.error('Failed to load data:', error)
        }
      }
      loadData()
    }
  }, [isAdmin, openTemplateDialog])

  // Load users and teams for admins
  useEffect(() => {
    if (isAdmin) {
      const loadAssignmentData = async () => {
        try {
          await fetchUsers()
          fetchTeams()
        } catch (error) {
          console.error('Failed to load users and teams:', error)
        }
      }
      loadAssignmentData()
    }
  }, [isAdmin])

  useEffect(() => {
    const loadTasks = async () => {
      const filters: any = {}

      if (statusFilter !== 'all') filters.status = statusFilter
      if (priorityFilter !== 'all') filters.priority = priorityFilter
      if (dueDateFilter !== 'all') filters.dueDate = dueDateFilter
      if (patientId) filters.patientId = patientId
      if (assignedToId) filters.assignedTo = assignedToId

      console.log('Fetching patient', patientId, '...')
      if (patientId) {
        await fetchTasksByPatient(patientId)
      } else {
        await fetchTasks(filters)
      }
    }

    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    patientId,
    assignedToId,
    statusFilter,
    priorityFilter,
    dueDateFilter])


  useEffect(() => {
    console.log('TaskList mounted')
    return () => console.log('TaskList unmounted')
  }, [])

  // const getDueDateInfo = (dueDate?: string) => {
  //   if (!dueDate) return null

  //   const date = new Date(dueDate)
  //   const isOverdue = isPast(date) && !isToday(date)

  //   return {
  //     text: isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'MMM d, yyyy'),
  //     isOverdue,
  //     date
  //   }
  // }

  const handleAssigneeChange = async (taskId: number, value: string) => {
    let updateData: any = {}

    if (value === "unassigned") {
      updateData = { assignedToId: null, assignedToTeamId: null }
    } else if (value.startsWith('team-')) {
      const teamId = parseInt(value.replace('team-', ''))
      updateData = { assignedToTeamId: teamId, assignedToId: null }
    } else {
      const userId = parseInt(value)
      updateData = { assignedToId: userId, assignedToTeamId: null }
    }

    const success = await updateTask(taskId, updateData)
    if (success) toast.success('Assignee updated')
    else toast.error('Failed to update assignee')
  }

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    const success = await updateTask(taskId, { status: newStatus })
    if (success) {
      toast.success('Status updated')
    } else {
      toast.error('Failed to update status')
    }
  }

  const handlePriorityChange = async (taskId: number, newPriority: TaskPriority) => {
    const success = await updateTask(taskId, { priority: newPriority })
    if (success) {
      toast.success('Priority updated')
    } else {
      toast.error('Failed to update priority')
    }
  }

  const handleDueDateChange = async (taskId: number, newDate: Date | undefined) => {
    const success = await updateTask(taskId, { dueDate: newDate })
    if (success) {
      toast.success('Due date updated')
    } else {
      toast.error('Failed to update due date')
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    const success = await deleteTask(taskId)
    if (success) {
      toast.success('Task deleted')
      // Refresh task list
      if (patientId) {
        await fetchTasksByPatient(patientId)
      } else {
        await fetchTasks({})
      }
    } else {
      toast.error('Failed to delete task')
    }
  }

  const handlePatientSearch = async (query: string) => {
    setPatientSearch(query)
    if (query.length > 2) {
      await searchPatients(query)
    } else {
      await fetchPatients()
    }
  }

  const selectPatient = (patient: any) => {
    if (!selectedPatients.includes(patient.id)) {
      setSelectedPatients(prev => [...prev, patient.id])
      setSelectedPatientObjects(prev => [...prev, patient])
    }
  }

  const removePatient = (patientId: number) => {
    setSelectedPatients(prev => prev.filter(id => id !== patientId))
    setSelectedPatientObjects(prev => prev.filter(p => p.id !== patientId))
  }

  const handleSearchSerialNumbers = async () => {
    const serialNumbers = parseSerialNumbers(serialNumberText)

    if (serialNumbers.length === 0) {
      toast.error('Please enter at least one serial number')
      return
    }

    setIsSearching(true)
    try {
      const result = await findPatientsBySerialNumbers(serialNumbers)
      setSerialMatches(result.matches)

      // Auto-select all found patients
      const foundPatientIds = result.matches
        .filter(m => m.found && m.patientId)
        .map(m => m.patientId!)

      const foundPatients = result.matches
        .filter(m => m.found && m.patientId)
        .map(m => ({
          id: m.patientId!,
          fname: m.patientName?.split(' ')[0] || '',
          lname: m.patientName?.split(' ').slice(1).join(' ') || '',
          mrn: m.serialNumber
        }))

      setSelectedPatients(foundPatientIds)
      setSelectedPatientObjects(foundPatients)

      toast.success(`Found ${foundPatientIds.length} patient(s)`)
    } catch (error) {
      toast.error('Failed to search serial numbers')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAssignTemplate = async () => {
    if (!selectedTemplate || selectedPatients.length === 0) {
      toast.error('Please select a template and at least one patient')
      return
    }

    setIsAssigning(true)
    try {
      const result = await assignTemplateToPatients(
        selectedTemplate,
        selectedPatients,
        templateDueDate ? format(templateDueDate, 'yyyy-MM-dd') : undefined
      )

      if (result.success > 0) {
        toast.success(`Template assigned to ${result.success} patient(s)`)
      }
      if (result.failed > 0) {
        toast.error(`Failed to assign to ${result.failed} patient(s)`)
      }

      setOpenTemplateDialog(false)
      setSelectedTemplate(null)
      setSelectedPatients([])
      setSelectedPatientObjects([])
      setTemplateDueDate(undefined)
      setPatientSearch('')
      setSerialNumberText('')
      setSerialMatches([])
      setAssignmentTab('browse')

      // Refresh tasks
      const filters: any = {}
      if (statusFilter !== 'all') filters.status = statusFilter
      if (priorityFilter !== 'all') filters.priority = priorityFilter
      if (dueDateFilter !== 'all') filters.dueDate = dueDateFilter
      await fetchTasks(filters)
    } catch (error) {
      toast.error('Failed to assign template')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleTaskCreated = async () => {
    setOpenNewTaskDialog(false)
    // Refresh tasks
    const filters: any = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (priorityFilter !== 'all') filters.priority = priorityFilter
    if (dueDateFilter !== 'all') filters.dueDate = dueDateFilter
    if (patientId) {
      await fetchTasksByPatient(patientId)
    } else {
      await fetchTasks(filters)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
    return true
  })

  const groupedTasks = {
    overdue: filteredTasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed'),
    today: filteredTasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'completed'),
    upcoming: filteredTasks.filter(
      t =>
        t.status !== 'completed' &&
        (!t.dueDate || (!isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))))
    ),
    completed: filteredTasks.filter(t => t.status === 'completed')
  }

  const commonTableProps = {
    onStatusChange: handleStatusChange,
    onPriorityChange: handlePriorityChange,
    onDueDateChange: handleDueDateChange,
    onAssigneeChange: handleAssigneeChange,
    onViewTask: (id: number) => navigate(`/tasks/${id}`),
    onDeleteTask: handleDeleteTask,
    showPatient: !patientId,
    users,
    teams,
    isAdmin
  }

  // const breadcrumbItems = [
  //   { label: 'Home', href: '/' },
  //   { label: 'Tasks', href: '/tasks', current: true }
  // ]

  return (
    <div className="container mx-auto">
      {/* <BreadcrumbNav items={breadcrumbItems} /> */}
      {/* Header with Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 pb-4">
            <>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TaskPriority | 'all')}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dueDateFilter} onValueChange={(v) => setDueDateFilter(v as DueDateFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Due Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="no_due_date">No Due Date</SelectItem>
                </SelectContent>
              </Select>

              {isAdmin && !patientId && (
                <Dialog open={openTemplateDialog} onOpenChange={setOpenTemplateDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Assign Template</span>
                      <span className="sm:hidden">Template</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Assign Task Template to Patients</DialogTitle>
                      <DialogDescription>
                        Select a template and patients to create tasks
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Template</Label>
                        <Select value={selectedTemplate?.toString()} onValueChange={(v) => setSelectedTemplate(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Due Date (Optional)</Label>
                        <Input
                          type="date"
                          value={templateDueDate ? format(templateDueDate, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              setTemplateDueDate(new Date(e.target.value))
                            } else {
                              setTemplateDueDate(undefined)
                            }
                          }}
                          className="w-full"
                        />
                      </div>

                      <Tabs value={assignmentTab} onValueChange={(v) => setAssignmentTab(v as 'browse' | 'serial')}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="browse">Browse Patients</TabsTrigger>
                          <TabsTrigger value="serial">By Serial Number</TabsTrigger>
                        </TabsList>

                        <TabsContent value="browse" className="space-y-4">
                          <div className="space-y-2">
                            <Label>Search and Select Patients</Label>
                            <Popover open={openPatientSearch} onOpenChange={setOpenPatientSearch} modal={true}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-start"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Patients ({selectedPatients.length} selected)
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[500px] p-0"
                                align="start"
                                onOpenAutoFocus={(e) => e.preventDefault()}
                              >
                                <div className="flex flex-col">
                                  <div className="border-b p-3">
                                    <Input
                                      placeholder="Search patients by name or MRN..."
                                      value={patientSearch}
                                      onChange={(e) => handlePatientSearch(e.target.value)}
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="max-h-[300px] overflow-y-auto">
                                    {patients.filter(p => !selectedPatients.includes(p.id)).length === 0 ? (
                                      <div className="p-8 text-center text-sm text-muted-foreground">
                                        {patientSearch ? 'No patients found.' : 'All available patients selected.'}
                                      </div>
                                    ) : (
                                      <div className="divide-y">
                                        {patients
                                          .filter(p => !selectedPatients.includes(p.id))
                                          .map((patient) => (
                                            <div
                                              key={patient.id}
                                              className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                                              onClick={() => selectPatient(patient)}
                                            >
                                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">
                                                  {patient.fname} {patient.lname}
                                                </div>
                                                <div className="text-sm text-muted-foreground truncate">
                                                  MRN: {patient.mrn}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="border-t p-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                      onClick={() => setOpenPatientSearch(false)}
                                    >
                                      Done
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Selected Patients ({selectedPatients.length})</Label>
                              {selectedPatients.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPatients([])
                                    setSelectedPatientObjects([])
                                  }}
                                >
                                  Clear All
                                </Button>
                              )}
                            </div>

                            {selectedPatientObjects.length === 0 ? (
                              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                                No patients selected. Click "Add Patients" to search and select.
                              </div>
                            ) : (
                              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                                <div className="divide-y">
                                  {selectedPatientObjects.map((patient) => (
                                    <div
                                      key={patient.id}
                                      className="flex items-center justify-between p-3 hover:bg-muted/50"
                                    >
                                      <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                          <p className="font-medium">
                                            {patient.fname} {patient.lname}
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                            MRN: {patient.mrn}
                                          </p>
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removePatient(patient.id)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="serial" className="space-y-4">
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Enter device or lead serial numbers (one per line, or comma/space separated).
                              The system will search for patients with matching devices or leads.
                            </AlertDescription>
                          </Alert>

                          <div className="space-y-2">
                            <Label>Serial Numbers</Label>
                            <Textarea
                              placeholder="e.g.,&#10;ABC123456&#10;XYZ789012&#10;or: ABC123456, XYZ789012"
                              value={serialNumberText}
                              onChange={(e) => setSerialNumberText(e.target.value)}
                              rows={6}
                            />
                          </div>

                          <Button
                            onClick={handleSearchSerialNumbers}
                            disabled={isSearching || !serialNumberText.trim()}
                            className="w-full"
                          >
                            <Search className="mr-2 h-4 w-4" />
                            {isSearching ? 'Searching...' : 'Search Serial Numbers'}
                          </Button>

                          {serialMatches.length > 0 && (
                            <div className="space-y-2">
                              <Label>Search Results ({serialMatches.filter(m => m.found).length} found, {selectedPatients.length} selected)</Label>
                              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                                <div className="divide-y">
                                  {serialMatches.map((match, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center space-x-3 p-3"
                                    >
                                      {match.found ? (
                                        <>
                                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                                          <div className="flex-1">
                                            <p className="font-medium">{match.patientName}</p>
                                            <p className="text-sm text-muted-foreground">
                                              Serial: {match.serialNumber} ({match.deviceType})
                                            </p>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="h-4 w-4 text-red-500" />
                                          <div className="flex-1">
                                            <p className="font-medium text-muted-foreground">{match.serialNumber}</p>
                                            <p className="text-sm text-red-500">
                                              {match.error || 'No patient found'}
                                            </p>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>

                      <div className="flex gap-2 justify-end pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setOpenTemplateDialog(false)
                            setSelectedTemplate(null)
                            setSelectedPatients([])
                            setSelectedPatientObjects([])
                            setTemplateDueDate(undefined)
                            setPatientSearch('')
                            setSerialNumberText('')
                            setSerialMatches([])
                            setAssignmentTab('browse')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAssignTemplate}
                          disabled={isAssigning || !selectedTemplate || selectedPatients.length === 0}
                        >
                          {isAssigning ? 'Assigning...' : `Assign to ${selectedPatients.length} Patient(s)`}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={openNewTaskDialog} onOpenChange={setOpenNewTaskDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>
                      Add a new task{patientId ? ' for this patient' : ''}
                    </DialogDescription>
                  </DialogHeader>
                  <TaskForm
                    patientId={patientId}
                    onSuccess={handleTaskCreated}
                    onCancel={() => setOpenNewTaskDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            </>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tasks found. Create your first task to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overdue Tasks */}
          {groupedTasks.overdue.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Overdue ({groupedTasks.overdue.length})
              </h3>
              <TaskTable tasks={groupedTasks.overdue} {...commonTableProps} />
            </div>
          )}

          {/* Today's Tasks */}
          {groupedTasks.today.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today ({groupedTasks.today.length})
              </h3>
              <TaskTable tasks={groupedTasks.today} {...commonTableProps} />
            </div>
          )}

          {/* Upcoming Tasks */}
          {groupedTasks.upcoming.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Upcoming ({groupedTasks.upcoming.length})
              </h3>
              <TaskTable tasks={groupedTasks.upcoming} {...commonTableProps} />
            </div>
          )}

          {/* Completed Tasks */}
          {groupedTasks.completed.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Completed ({groupedTasks.completed.length})
              </h3>
              <TaskTable tasks={groupedTasks.completed} {...commonTableProps} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TaskTableProps {
  tasks: Task[]
  onStatusChange: (taskId: number, status: TaskStatus) => void
  onPriorityChange: (taskId: number, priority: TaskPriority) => void
  onDueDateChange: (taskId: number, date: Date | undefined) => void
  onAssigneeChange: (taskId: number, value: string) => void
  onViewTask: (taskId: number) => void
  onDeleteTask: (taskId: number) => void
  showPatient?: boolean
  users: any[]
  teams: Team[]
  isAdmin: boolean
}

function TaskTable({
  tasks,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  onAssigneeChange,
  onViewTask,
  onDeleteTask,
  showPatient = true,
  users,
  teams,
  isAdmin
}: TaskTableProps) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[25%]">Task</TableHead>
            {showPatient && <TableHead className="w-[15%]">Patient</TableHead>}
            <TableHead className="w-[10%]">Priority</TableHead>
            <TableHead className="w-[15%]">Status</TableHead>
            <TableHead className="w-[15%]">Due Date</TableHead>
            <TableHead className="w-[15%]">Assigned to</TableHead>
            <TableHead className="w-[5%]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              onDueDateChange={onDueDateChange}
              onAssigneeChange={onAssigneeChange}
              onViewTask={onViewTask}
              onDeleteTask={onDeleteTask}
              showPatient={showPatient}
              users={users}
              teams={teams}
              isAdmin={isAdmin}
            />
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

interface TaskRowProps {
  task: Task
  onStatusChange: (taskId: number, status: TaskStatus) => void
  onPriorityChange: (taskId: number, priority: TaskPriority) => void
  onDueDateChange: (taskId: number, date: Date | undefined) => void
  onAssigneeChange: (taskId: number, value: string) => void
  onViewTask: (taskId: number) => void
  onDeleteTask: (taskId: number) => void
  showPatient?: boolean
  users: any[]
  teams: Team[]
  isAdmin: boolean
}

function TaskRow({
  task,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  onAssigneeChange,
  onViewTask,
  onDeleteTask,
  showPatient = true,
  users,
  teams,
  isAdmin
}: TaskRowProps) {
  const dueDateInfo = getDueDateInfo(task.dueDate)
  const PriorityIcon = priorityConfig[task.priority].icon
  const StatusIcon = statusConfig[task.status].icon

  return (
    <TableRow className="hover:bg-muted/50">
      {/* Task Title & Description */}
      <TableCell className="text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{task.title}</span>
            {task.description && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-muted"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {task.tags.map((tag) => (
                <Badge
                  key={tag.ID}
                  variant="outline"
                  style={{ borderColor: tag.color, color: tag.color }}
                  className="text-xs"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </TableCell>

      {/* Patient */}
      {showPatient && (
        <TableCell className="text-left">
          {task.patient ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {task.patient.fname} {task.patient.lname}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {/* Priority - Editable */}
      <TableCell className="text-left">
        <Select
          value={task.priority}
          onValueChange={(value: TaskPriority) => onPriorityChange(task.id, value)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue>
              <div className="flex items-center gap-2">
                <PriorityIcon className={cn("h-3 w-3", priorityConfig[task.priority].color.replace('bg-', 'text-'))} />
                <span>{priorityConfig[task.priority].label}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 text-blue-500" />
                Low
              </div>
            </SelectItem>
            <SelectItem value="medium">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 text-yellow-500" />
                Medium
              </div>
            </SelectItem>
            <SelectItem value="high">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                High
              </div>
            </SelectItem>
            <SelectItem value="urgent">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-red-500" />
                Urgent
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      {/* Status - Editable */}
      <TableCell className="text-left">
        <Select
          value={task.status}
          onValueChange={(value: TaskStatus) => onStatusChange(task.id, value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue>
              <div className="flex items-center gap-2">
                <StatusIcon className={cn("h-3 w-3", statusConfig[task.status].color.replace('bg-', 'text-'))} />
                <span>{statusConfig[task.status].label}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 text-gray-500" />
                Pending
              </div>
            </SelectItem>
            <SelectItem value="in_progress">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-blue-500" />
                In Progress
              </div>
            </SelectItem>
            <SelectItem value="completed">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Completed
              </div>
            </SelectItem>
            <SelectItem value="cancelled">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 text-red-500" />
                Cancelled
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      {/* Due Date - Editable */}
      <TableCell className="text-left">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[150px] justify-start text-left font-normal",
                !task.dueDate && "text-muted-foreground",
                dueDateInfo?.isOverdue && "border-red-500 text-red-600"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {dueDateInfo ? dueDateInfo.text : 'Set date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={task.dueDate ? new Date(task.dueDate) : undefined}
              onSelect={(date) => onDueDateChange(task.id, date)}
              initialFocus
            />
            {task.dueDate && (
              <div className="p-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => onDueDateChange(task.id, undefined)}
                >
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </TableCell>

      {/* Assigned To */}
      <TableCell className="text-left">
        {isAdmin ? (
          <Select
            value={
              task.assignedToTeamId ? `team-${task.assignedToTeamId}`
                : task.assignedToId ? task.assignedToId.toString()
                  : "unassigned"
            }
            onValueChange={(value) => onAssigneeChange(task.id, value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teams.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Teams</div>
                  {teams.map((team) => (
                    <SelectItem key={`team-${team.id}`} value={`team-${team.id}`}>
                      <div className="flex items-center gap-2">
                        {team.color && (
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                        )}
                        <span>{team.name}</span>
                        <Badge variant="outline" className="text-xs ml-1">Team</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
              {users.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Users</div>
                  {users.map((u) => (
                    <SelectItem key={u.ID} value={u.ID.toString()}>
                      {u.fullName || u.username}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2">
            {task.assignedToTeam ? (
              <>
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-1.5">
                  {task.assignedToTeam.color && (
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: task.assignedToTeam.color }}
                    />
                  )}
                  <span className="text-sm font-medium">
                    {task.assignedToTeam.name}
                  </span>
                  <Badge variant="outline" className="text-xs">Team</Badge>
                </div>
              </>
            ) : task.assignedTo ? (
              <>
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {task.assignedTo.fullName || task.assignedTo.username}
                </span>
              </>
            ) : (
              <>
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Unassigned</span>
              </>
            )}
          </div>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewTask(task.id)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteTask(task.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function getDueDateInfo(dueDate?: string) {
  if (!dueDate) return null

  const date = new Date(dueDate)
  const isOverdue = isPast(date) && !isToday(date)

  return {
    text: isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'MMM d, yyyy'),
    isOverdue,
    date
  }
}