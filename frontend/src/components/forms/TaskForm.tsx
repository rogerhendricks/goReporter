import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/stores/taskStore'
import type { CreateTaskData, TaskStatus, TaskPriority } from '@/stores/taskStore'
import { usePatientStore } from '@/stores/patientStore'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { useTeamStore } from '@/stores/teamStore'
import { tagService } from '@/services/tagService'
import type { Team } from '@/services/teamService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, X, Plus, User, Users } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useFormShortcuts } from '@/hooks/useFormShortcuts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'


interface TaskFormProps {
  patientId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

export function TaskForm({ patientId, onSuccess, onCancel }: TaskFormProps) {
  const navigate = useNavigate()
  const { createTask, isLoading } = useTaskStore()
  const { patients, fetchPatients, searchPatients } = usePatientStore()
  const { users, fetchUsers } = useUserStore()
  const { teams, fetchTeams } = useTeamStore()
  const { user } = useAuthStore()
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [assignmentType, setAssignmentType] = useState<'user' | 'team'>('user')
  const isAdminOrDoctor = user?.role === 'admin' || user?.role === 'doctor'

  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: undefined,
    patientId: patientId,
    assignedToId: isAdminOrDoctor ? undefined : Number(user?.ID),
    assignedToTeamId: undefined,
    tagIds: []
  })

  const [selectedTags, setSelectedTags] = useState<any[]>([])
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [openPatientSearch, setOpenPatientSearch] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const tags = await tagService.getAll()
        setAvailableTags(tags)

        if (isAdminOrDoctor) {
          await fetchUsers()
          fetchTeams()
        }
      } catch (error) {
        console.error('Failed to load form data:', error)
      }
    }
    loadData()

    if (!patientId) {
      fetchPatients()
    } else {
      // If patientId is provided, find and set the selected patient
      const patient = patients.find(p => p.id === patientId)
      if (patient) {
        setSelectedPatient(patient)
      }
    }
  }, [patientId, patients.length, fetchPatients, isAdminOrDoctor, fetchUsers, fetchTeams])

  const handlePatientSearch = async (query: string) => {
    setPatientSearch(query)
    if (query.length > 2) {
      await searchPatients(query)
    } else {
      await fetchPatients()
    }
  }

  const selectPatient = (patient: any) => {
    setSelectedPatient(patient)
    setFormData({ ...formData, patientId: patient.id })
    setOpenPatientSearch(false)
    setPatientSearch('')
  }

  const removePatient = () => {
    setSelectedPatient(null)
    setFormData({ ...formData, patientId: undefined })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Please enter a task title')
      return
    }

    const submitData: CreateTaskData = {
      ...formData,
      dueDate: dueDate,
      tagIds: selectedTags.map(t => t.ID)
    }

    const result = await createTask(submitData)
    
    if (result) {
      toast.success('Task created successfully')
      if (onSuccess) {
        onSuccess()
      } else {
        navigate(patientId ? `/patients/${patientId}` : '/tasks')
      }
    } else {
      toast.error('Failed to create task')
    }
  }

  useFormShortcuts(handleSubmit);
  
  const toggleTag = (tag: any) => {
    setSelectedTags(prev => {
      const exists = prev.find(t => t.ID === tag.ID)
      if (exists) {
        return prev.filter(t => t.ID !== tag.ID)
      }
      return [...prev, tag]
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full max-w-md mx-auto mt-4">
        <CardHeader>
          <CardTitle>Create New Task</CardTitle>
          <CardDescription>
            Add a new task{patientId ? ' for this patient' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task description"
              rows={4}
            />
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TaskPriority) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: TaskStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Assign To - Only show for admin/doctor */}
          {isAdminOrDoctor && (
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Tabs value={assignmentType} onValueChange={(v) => {
                setAssignmentType(v as 'user' | 'team')
                if (v === 'user') {
                  setFormData({ ...formData, assignedToTeamId: undefined })
                } else {
                  setFormData({ ...formData, assignedToId: undefined })
                }
              }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="user">
                    <User className="h-4 w-4 mr-2" />
                    User
                  </TabsTrigger>
                  <TabsTrigger value="team">
                    <Users className="h-4 w-4 mr-2" />
                    Team
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="user" className="mt-2">
                  <Select
                    value={formData.assignedToId?.toString() || "self"}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      assignedToId: value === "self" ? Number(user?.ID) : parseInt(value),
                      assignedToTeamId: undefined
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to yourself" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Assign to myself</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.ID} value={u.ID.toString()}>
                          {u.fullName || u.username} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
                <TabsContent value="team" className="mt-2">
                  <Select
                    value={formData.assignedToTeamId?.toString() || ""}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      assignedToTeamId: value ? parseInt(value) : undefined,
                      assignedToId: undefined
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          <div className="flex items-center gap-2">
                            {team.color && (
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: team.color }}
                              />
                            )}
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Show assigned user for regular users (read-only) */}
          {!isAdminOrDoctor && user && (
            <div className="p-4 border rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Assigned To</div>
                  <div className="text-sm text-muted-foreground">
                    {user.username} (You)
                  </div>
                </div>
              </div>
            </div>
          )}
        

          {/* Patient Selection (if not provided via prop) */}
          {!patientId && (
            <div className="space-y-2">
              <Label>Patient (Optional)</Label>
              
              {selectedPatient ? (
                <div className="p-4 border rounded-lg bg-muted">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {selectedPatient.fname} {selectedPatient.lname}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          MRN: {selectedPatient.mrn} • DOB: {selectedPatient.dob ? format(new Date(selectedPatient.dob), 'MMM d, yyyy') : 'N/A'}
                        </div>
                        {selectedPatient.email && (
                          <div className="text-sm text-muted-foreground">
                            {selectedPatient.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removePatient}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Popover open={openPatientSearch} onOpenChange={setOpenPatientSearch} modal={true} >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Select Patient
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search patients by name or MRN..."
                        value={patientSearch}
                        onValueChange={handlePatientSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No patients found.</CommandEmpty>
                        <CommandGroup>
                          {patients.map((patient) => (
                            <CommandItem
                              key={patient.id}
                              onSelect={() => selectPatient(patient)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {patient.fname} {patient.lname}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    MRN: {patient.mrn} • DOB: {patient.dob ? format(new Date(patient.dob), 'MMM d, yyyy') : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}

          {/* If patientId is provided, show patient info */}
          {patientId && selectedPatient && (
            <div className="p-4 border rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {selectedPatient.fname} {selectedPatient.lname}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    MRN: {selectedPatient.mrn}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assign To */}
          {/* {users.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign To (Optional)</Label>
              <Select
                value={formData.assignedToId?.toString() || "unassigned"}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  assignedToId: value === "unassigned" ? undefined : parseInt(value) 
                })}
              >
                <SelectTrigger id="assignedTo">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.ID} value={user.ID.toString()}>
                      {user.username} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )} */}

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map(tag => (
                <Badge
                  key={tag.ID}
                  style={{ backgroundColor: tag.color }}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag.name}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags
                .filter(tag => !selectedTags.find(t => t.ID === tag.ID))
                .map(tag => (
                  <Badge
                    key={tag.ID}
                    variant="outline"
                    style={{ borderColor: tag.color, color: tag.color }}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag.name}
                  </Badge>
                ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Task'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                if (onCancel) {
                  onCancel()
                } else {
                  navigate(patientId ? `/patients/${patientId}` : '/tasks')
                }
              }}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}