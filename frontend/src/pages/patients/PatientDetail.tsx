import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { usePatientStore, type Patient } from '@/stores/patientStore'
import { tagService, type Tag } from '@/services/tagService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Edit, Trash2, Phone, Mail, MapPin, Plus, Check, X, ClipboardList } from 'lucide-react'
import { DetailPageSkeleton } from '@/components/ui/loading-skeletons'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QRSDurationChart } from '@/components/charts/QRSDurationChart'
import { TaskForm } from '@/components/forms/TaskForm'
import { TaskList } from '@/components/tasks/TaskList'
import { ConsentManager } from '@/components/ConsentManager'
import { PatientAppointments } from '@/components/appointments/PatientAppointments'
import { taskTemplateService, type TaskTemplate } from '@/services/taskTemplateService'
import { assignTemplateToPatients } from '@/utils/serialNumberMatcher'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentPatient, loading, fetchPatient, deletePatient, updatePatient } = usePatientStore()
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [openTagSearch, setOpenTagSearch] = useState(false)
  const [openTaskDialog, setOpenTaskDialog] = useState(false)
  const [openTemplateDialog, setOpenTemplateDialog] = useState(false)
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [templateDueDate, setTemplateDueDate] = useState<Date | undefined>()
  const [isAssigning, setIsAssigning] = useState(false)
  useEffect(() => {
    loadTags()
    loadTemplates()
    if (id) {
      fetchPatient(parseInt(id))
    }
  }, [id])

  const loadTags = async () => {
    try {
      const tags = await tagService.getAll('patient')
      setAvailableTags(tags)
    } catch (error) {
      console.error("Failed to load tags:", error)
    }
  }

  const loadTemplates = async () => {
    try {
      const templatesData = await taskTemplateService.getAll()
      setTemplates(templatesData)
    } catch (error) {
      console.error("Failed to load templates:", error)
    }
  }

  const handleToggleTag = async (tagId: number) => {
    if (!currentPatient) return

    const currentTags = currentPatient.tags || []
    const isSelected = currentTags.some((t: any) => t.ID === tagId)
    
    let newTags: number[]
    if (isSelected) {
      newTags = currentTags.filter((t: any) => t.ID !== tagId).map((t: any) => t.ID)
    } else {
      newTags = [...currentTags.map((t: any) => t.ID), tagId]
    }

    try {
      await updatePatient(currentPatient.id, { tags: newTags } as unknown as Partial<Patient>)
      toast.success("Tags updated successfully")
    } catch (error) {
      console.error("Failed to update tags:", error)
      toast.error("Failed to update tags")
    }
  }

  const handleDelete = async () => {
    if (currentPatient && window.confirm(`Are you sure you want to delete ${currentPatient.fname} ${currentPatient.lname}?`)) {
      await deletePatient(currentPatient.id)
      navigate('/patients')
    }
  }

  const handleTaskCreated = () => {
    setOpenTaskDialog(false)
    toast.success('Task created successfully')
    if (id) {
      fetchPatient(parseInt(id))
    }
  }

  const handleAssignTemplate = async () => {
    if (!selectedTemplate || !currentPatient) {
      toast.error('Please select a template')
      return
    }

    setIsAssigning(true)
    try {
      const result = await assignTemplateToPatients(
        selectedTemplate,
        [currentPatient.id],
        templateDueDate ? format(templateDueDate, 'yyyy-MM-dd') : undefined
      )

      if (result.success > 0) {
        toast.success('Template assigned successfully')
        setOpenTemplateDialog(false)
        setSelectedTemplate(null)
        setTemplateDueDate(undefined)
        if (id) {
          fetchPatient(parseInt(id))
        }
      } else if (result.failed > 0) {
        toast.error(result.errors?.[0] || 'Failed to assign template')
      }
    } catch (error) {
      toast.error('Failed to assign template')
    } finally {
      setIsAssigning(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Patients', href: '/patients' },
    { label: currentPatient ? `${currentPatient.fname} ${currentPatient.lname}` : 'Loading...', current: true }
  ]

  if (loading) {
    return <DetailPageSkeleton />
  }

  if (!currentPatient) {
    return (
      <div className="container mx-auto py-6">
        <BreadcrumbNav items={[
          { label: 'Home', href: '/' },
          { label: 'Patients', href: '/patients' },
          { label: 'Not Found', current: true }
        ]} />
        <div className="text-center py-8">Patient not found</div>
      </div>
    )
  }

  const patientTags = currentPatient.tags || []
  const displayedTags = patientTags.slice(0, 2)
  const remainingTagsCount = patientTags.length -2

  return (
    <div className="container mx-auto">
      <BreadcrumbNav items={breadcrumbItems} />
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <Dialog open={openTemplateDialog} onOpenChange={setOpenTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ClipboardList className="mr-2 h-4 w-4" />
                Assign Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Task Template</DialogTitle>
                <DialogDescription>
                  Select a task template to assign to {currentPatient.fname} {currentPatient.lname}
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
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {templateDueDate ? format(templateDueDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={templateDueDate}
                        onSelect={setTemplateDueDate}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAssignTemplate} disabled={isAssigning || !selectedTemplate}>
                    {isAssigning ? 'Assigning...' : 'Assign Template'}
                  </Button>
                  <Button variant="outline" onClick={() => setOpenTemplateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={openTaskDialog} onOpenChange={setOpenTaskDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ClipboardList className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Task for {currentPatient.fname} {currentPatient.lname}</DialogTitle>
                <DialogDescription>
                  Create a new task associated with this patient
                </DialogDescription>
              </DialogHeader>
              <TaskForm 
                patientId={currentPatient.id} 
                onSuccess={handleTaskCreated}
                onCancel={() => setOpenTaskDialog(false)}
              />
            </DialogContent>
          </Dialog>
          <Button asChild>
            <Link to={`/patients/${currentPatient.id}/reports/new`}>
              <Plus className="mr-2 h-4 w-4" /> Create New Report
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to={`/patients/${currentPatient.id}/reports`} className="flex items-center gap-2">
              View All
              <Badge variant="outline" className="bg-background">
                {currentPatient.reportCount || 0}
              </Badge>
            </Link>
          </Button>
          <Button onClick={() => navigate(`/patients/${currentPatient.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong>MRN:</strong> {currentPatient.mrn}
            </div>
            <div>
              <strong>Date of Birth:</strong> {formatDate(currentPatient.dob)}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{currentPatient.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{currentPatient.email}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1" />
              <div className='text-left leading-tight'>
                {currentPatient.street}<br />
                {currentPatient.city}, {currentPatient.state}<br />
                {currentPatient.country} {currentPatient.postal}
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Tags</span>
                <Popover open={openTagSearch} onOpenChange={setOpenTagSearch}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Add Tag</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search tags..." />
                      <CommandList>
                        <CommandEmpty>No tags found.</CommandEmpty>
                        <CommandGroup>
                          {availableTags.map((tag) => {
                            const isSelected = currentPatient.tags?.some((t: any) => t.ID === tag.ID)
                            return (
                              <CommandItem
                                key={tag.ID}
                                onSelect={() => handleToggleTag(tag.ID)}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span>{tag.name}</span>
                                  {isSelected && <Check className="ml-auto h-4 w-4" />}
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {patientTags.length > 0 ? (
                  <>
                    {displayedTags.map((tag: any) => (
                      <Badge
                        key={tag.ID}
                        variant="outline"
                        className="flex items-center gap-1 pr-1"
                        style={{ 
                          borderColor: tag.color, 
                          color: tag.color,
                          backgroundColor: `${tag.color}10`
                        }}
                      >
                        {tag.name}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent text-current"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleTag(tag.ID)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {remainingTagsCount > 0 && (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Badge 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            +{remainingTagsCount} more
                          </Badge>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold mb-2">All Tags</h4>
                            <div className="flex flex-wrap gap-2">
                              {patientTags.map((tag: any) => (
                                <Badge
                                  key={tag.ID}
                                  variant="outline"
                                  className="flex items-center gap-1 pr-1"
                                  style={{ 
                                    borderColor: tag.color, 
                                    color: tag.color,
                                    backgroundColor: `${tag.color}10`
                                  }}
                                >
                                  {tag.name}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 ml-1 hover:bg-transparent text-current"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleToggleTag(tag.ID)
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground italic">No tags assigned</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <PatientAppointments
          patientId={currentPatient.id}
          patientName={`${currentPatient.fname} ${currentPatient.lname}`}
        />
        <Card>
          <CardHeader>
            <CardTitle>Assigned Doctors ({currentPatient.patientDoctors?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {currentPatient.patientDoctors && currentPatient.patientDoctors.length > 0 ? (
              <div className="relative">
                <div className="max-h-[240px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-muted/10">
                  {currentPatient.patientDoctors.map((patientDoctor) => (
                    <div key={patientDoctor.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="font-semibold">{patientDoctor.doctor.fullName}</div>
                        {patientDoctor.isPrimary && (
                          <Badge variant="default">Primary</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{patientDoctor.doctor.email}</div>
                      <div className="text-sm text-muted-foreground">{patientDoctor.doctor.phone}</div>
                      {patientDoctor.address && (
                        <div className="text-xs text-muted-foreground">
                          {patientDoctor.address.street}, {patientDoctor.address.city}, {patientDoctor.address.state} {patientDoctor.address.zip}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {currentPatient.patientDoctors.length > 3 && (
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No doctors assigned</p>
            )}
          </CardContent>
        </Card>

        {currentPatient.devices && currentPatient.devices.length > 0 && (
          <Card className="md:col-span-2 bg-sky-500/50">
            <CardHeader>
              <CardTitle>Implanted Devices ({currentPatient.devices?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Device</TableHead>
                    <TableHead className="text-left">Serial</TableHead>
                    <TableHead className="text-left">Implanted On</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPatient.devices.map((implanted) => (
                    <TableRow key={implanted.id}>
                      <TableCell className="text-left">
                        <div className="text-sm text-muted-foreground">
                          {implanted.device.manufacturer} {implanted.device.model}
                        </div>
                        <div className="font-medium">{implanted.device.name}</div>
                      </TableCell>
                      <TableCell className="text-left">{implanted.serial}</TableCell>
                      <TableCell className="text-left">{formatDate(implanted.implantedAt)}</TableCell>
                      <TableCell className="text-left">
                        <Badge variant={implanted.explantedAt ? "destructive" : "default"}>
                          {implanted.explantedAt ? "Explanted" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2 bg-fuchsia-500/50">
          <CardHeader>
            <CardTitle>Implanted Leads ({currentPatient.leads?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {currentPatient.leads && currentPatient.leads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Lead</TableHead>
                    <TableHead className="text-left">Serial</TableHead>
                    <TableHead className="text-left">Chamber</TableHead>
                    <TableHead className="text-left">Implanted On</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPatient.leads.map((implanted) => (
                    <TableRow key={implanted.id}>
                      <TableCell className="text-left">
                        <div className="text-sm text-muted-foreground">{implanted.lead.manufacturer} {implanted.lead.leadModel}</div>
                        <div className="font-medium">{implanted.lead.name}</div>
                      </TableCell>
                      <TableCell className="text-left">{implanted.serial}</TableCell>
                      <TableCell className="text-left">{implanted.chamber}</TableCell>
                      <TableCell className="text-left">{formatDate(implanted.implantedAt)}</TableCell>
                      <TableCell className="text-left">{implanted.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No leads implanted</p>
            )}
          </CardContent>
        </Card>

        {currentPatient.medications && currentPatient.medications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Medications ({currentPatient.medications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentPatient.medications.map((medication, index) => (
                  <Badge key={index} variant="outline">
                    {medication.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* QRS Duration Chart */}
        <div className="md:col-span-2">
          <QRSDurationChart
            reports={(currentPatient.reports || []).map(r => ({
              reportDate: r.reportDate,
              qrs_duration: r.qrs_duration ?? null,
            }))}
          />
        </div>

        {/* Patient Tasks */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <Dialog open={openTaskDialog} onOpenChange={setOpenTaskDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      New Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Task for {currentPatient.fname} {currentPatient.lname}</DialogTitle>
                      <DialogDescription>
                        Create a new task associated with this patient
                      </DialogDescription>
                    </DialogHeader>
                    <TaskForm 
                      patientId={currentPatient.id} 
                      onSuccess={handleTaskCreated}
                      onCancel={() => setOpenTaskDialog(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <TaskList patientId={currentPatient.id} showFilters={false} />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <ConsentManager patientId={currentPatient.id} />  
        </div>
      </div>
    </div>
  )
}