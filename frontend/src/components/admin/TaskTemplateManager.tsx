import React, { useEffect, useState } from 'react'
import axios from '@/utils/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, UserPlus, CalendarIcon, Search, CheckCircle, XCircle, AlertCircle, User, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { tagService } from '@/services/tagService'
import { usePatientStore } from '@/stores/patientStore'
import { format } from 'date-fns'
import { 
  findPatientsBySerialNumbers, 
  parseSerialNumbers, 
  assignTemplateToPatients,
  type SerialNumberMatch 
} from '@/utils/serialNumberMatcher'

interface TaskTemplate {
  id: number
  name: string
  description: string
  title: string
  taskDescription: string
  priority: string
  daysUntilDue?: number
  tags?: any[]
}

const ITEMS_PER_PAGE = 10;

export function TaskTemplateManager() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  // State for assigning to patients
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [selectedPatients, setSelectedPatients] = useState<number[]>([])
  const [selectedPatientObjects, setSelectedPatientObjects] = useState<any[]>([])
  const [patientsWithTemplate, setPatientsWithTemplate] = useState<number[]>([])
  const [assignDueDate, setAssignDueDate] = useState<Date>()
  const [isAssigning, setIsAssigning] = useState(false)
  const [openPatientSearch, setOpenPatientSearch] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  
  // State for serial number matching
  const [serialNumberText, setSerialNumberText] = useState('')
  const [serialMatches, setSerialMatches] = useState<SerialNumberMatch[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [assignmentTab, setAssignmentTab] = useState<'browse' | 'serial'>('browse')
  
  const { patients, fetchPatients, searchPatients } = usePatientStore()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    title: '',
    taskDescription: '',
    priority: 'medium',
    daysUntilDue: undefined as number | undefined,
    tagIds: [] as number[]
  })

  useEffect(() => {
    loadTemplates()
    loadTags()
    fetchPatients()
  }, [fetchPatients])

  const loadTemplates = async () => {
    try {
      const response = await axios.get('/task-templates')
      setTemplates(response.data)
    } catch (error) {
      toast.error('Failed to load templates')
    }
  }

  const loadTags = async () => {
    try {
      const tags = await tagService.getAll();
      setAvailableTags(tags)
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const loadPatientsWithTemplate = async (templateId: number) => {
    try {
      const response = await axios.get(`/task-templates/${templateId}/patients`)
      setPatientsWithTemplate(response.data.patientIds || [])
    } catch (error) {
      console.error('Failed to load patients with template:', error)
      setPatientsWithTemplate([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingTemplate) {
        await axios.put(`/task-templates/${editingTemplate.id}`, formData)
        toast.success('Template updated successfully')
      } else {
        await axios.post('/task-templates', formData)
        toast.success('Template created successfully')
      }
      
      loadTemplates()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      toast.error('Failed to save template')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (template: TaskTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description,
      title: template.title,
      taskDescription: template.taskDescription,
      priority: template.priority,
      daysUntilDue: template.daysUntilDue,
      tagIds: template.tags?.map(t => t.ID) || []
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return

    try {
      await axios.delete(`/task-templates/${id}`)
      toast.success('Template deleted successfully')
      loadTemplates()
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error(error.response?.data?.error || 'Cannot delete template: tasks are using this template')
      } else {
        toast.error('Failed to delete template')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      title: '',
      taskDescription: '',
      priority: 'medium',
      daysUntilDue: undefined,
      tagIds: []
    })
    setEditingTemplate(null)
  }

  const toggleTag = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }))
  }

  const handleAssignToPatients = async (template: TaskTemplate) => {
    setSelectedTemplate(template)
    setSelectedPatients([])
    setSelectedPatientObjects([])
    setAssignDueDate(undefined)
    setSerialNumberText('')
    setSerialMatches([])
    setAssignmentTab('browse')
    setPatientSearch('')
    await loadPatientsWithTemplate(template.id)
    setIsAssignDialogOpen(true)
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
    // Check if patient already has this template
    if (patientsWithTemplate.includes(patient.id)) {
      toast.error(`${patient.fname} ${patient.lname} already has this task template assigned`)
      return
    }
    
    if (!selectedPatients.includes(patient.id)) {
      setSelectedPatients(prev => [...prev, patient.id])
      setSelectedPatientObjects(prev => [...prev, patient])
      toast.success(`Added ${patient.fname} ${patient.lname}`)
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
      
      // Auto-select all found patients (excluding those who already have the template)
      const foundPatientIds = result.matches
        .filter(m => m.found && m.patientId && !patientsWithTemplate.includes(m.patientId))
        .map(m => m.patientId!)
      
      // Get the full patient objects for found patients
      const foundPatients = result.matches
        .filter(m => m.found && m.patientId && !patientsWithTemplate.includes(m.patientId))
        .map(m => ({
          id: m.patientId!,
          fname: m.patientName?.split(' ')[0] || '',
          lname: m.patientName?.split(' ').slice(1).join(' ') || '',
          mrn: m.serialNumber
        }))
      
      setSelectedPatients(foundPatientIds)
      setSelectedPatientObjects(foundPatients)
      
      const alreadyAssigned = result.matches.filter(m => m.found && m.patientId && patientsWithTemplate.includes(m.patientId)).length
      
      if (alreadyAssigned > 0) {
        toast.warning(`Found ${result.totalFound} patient(s), ${alreadyAssigned} already have this template assigned`)
      } else {
        toast.success(`Found ${result.totalFound} patient(s), ${result.totalNotFound} not found`)
      }
    } catch (error) {
      toast.error('Failed to search serial numbers')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAssignSubmit = async () => {
    if (!selectedTemplate || selectedPatients.length === 0) {
      toast.error('Please select at least one patient')
      return
    }

    setIsAssigning(true)
    try {
      const result = await assignTemplateToPatients(
        selectedTemplate.id,
        selectedPatients,
        assignDueDate ? format(assignDueDate, 'yyyy-MM-dd') : undefined
      )

      if (result.success > 0) {
        toast.success(`Template assigned to ${result.success} patient(s)`)
      }
      
      if (result.failed > 0) {
        toast.error(`Failed to assign to ${result.failed} patient(s)`)
        console.error('Assignment errors:', result.errors)
      }

      setIsAssignDialogOpen(false)
      setSelectedTemplate(null)
      setSelectedPatients([])
      setSelectedPatientObjects([])
      setPatientsWithTemplate([])
      setAssignDueDate(undefined)
      setSerialNumberText('')
      setSerialMatches([])
    } catch (error) {
      toast.error('Failed to assign template to patients')
    } finally {
      setIsAssigning(false)
    }
  }

  const renderTags = (tags: any[]) => {
    if (!tags || tags.length === 0) {
      return <span className="text-sm text-muted-foreground">No tags</span>
    }

    if (tags.length === 1) {
      const tag = tags[0]
      return (
        <Badge
          variant="outline"
          style={{ borderColor: tag.color, color: tag.color }}
          className="text-xs"
        >
          {tag.name}
        </Badge>
      )
    }

    const displayedTag = tags[0]
    const remainingCount = tags.length - 1

    return (
      <div className="flex flex-wrap gap-1 items-center">
        <Badge
          variant="outline"
          style={{ borderColor: displayedTag.color, color: displayedTag.color }}
          className="text-xs"
        >
          {displayedTag.name}
        </Badge>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Badge 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              +{remainingCount} more
            </Badge>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold mb-2">All Tags</h4>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.ID}
                    variant="outline"
                    style={{ 
                      borderColor: tag.color, 
                      color: tag.color,
                      backgroundColor: `${tag.color}10`
                    }}
                    className="text-xs"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    )
  }

  // Pagination logic
  const totalPages = Math.ceil(templates.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTemplates = templates.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getPatientsWithTemplateList = () => {
    return patients.filter(p => patientsWithTemplate.includes(p.id))
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Task Template Management</CardTitle>
          <CardDescription>
            Create and manage reusable templates for common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? 'Edit Template' : 'Create New Template'}
                  </DialogTitle>
                  <DialogDescription>
                    Create a reusable template for tasks that you perform frequently
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Follow-up Appointment"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Template Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe when to use this template"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Task Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Title for tasks created from this template"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taskDescription">Task Description</Label>
                    <Textarea
                      id="taskDescription"
                      value={formData.taskDescription}
                      onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                      placeholder="Description for tasks created from this template"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
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
                      <Label htmlFor="daysUntilDue">Days Until Due</Label>
                      <Input
                        id="daysUntilDue"
                        type="number"
                        value={formData.daysUntilDue ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          daysUntilDue: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="Optional"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => (
                        <Badge
                          key={tag.ID}
                          variant={formData.tagIds.includes(tag.ID) ? "default" : "outline"}
                          style={formData.tagIds.includes(tag.ID) ? { backgroundColor: tag.color } : { borderColor: tag.color, color: tag.color }}
                          className="cursor-pointer"
                          onClick={() => toggleTag(tag.ID)}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsDialogOpen(false)
                        resetForm()
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Template Name</TableHead>
                  <TableHead className="text-left">Task Title</TableHead>
                  <TableHead className="text-left">Priority</TableHead>
                  <TableHead className="text-left">Due In</TableHead>
                  <TableHead className="text-left">Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No templates found. Create your first template to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentTemplates.map((template) => (
                    <TableRow key={template.id} className="text-left">
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.title}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(template.priority)}>
                          {template.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.daysUntilDue ? (
                          <Badge variant="outline">
                            {template.daysUntilDue} days
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {renderTags(template.tags)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleAssignToPatients(template)}
                            title="Assign to patients"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {templates.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, templates.length)} of {templates.length} templates
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign to Patients Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Template to Patients</DialogTitle>
            <DialogDescription>
              Select patients to assign the "{selectedTemplate?.name}" template to
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Info */}
            {selectedTemplate && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Template: {selectedTemplate.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Task: {selectedTemplate.title}</p>
                    <p className="text-sm text-muted-foreground">{selectedTemplate.taskDescription}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(selectedTemplate.priority)}>
                      {selectedTemplate.priority}
                    </Badge>
                    {selectedTemplate.daysUntilDue && (
                      <Badge variant="outline">Due in {selectedTemplate.daysUntilDue} days</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Patients Already Assigned Alert */}
            {patientsWithTemplate.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">{patientsWithTemplate.length} patient(s) already have this template assigned:</p>
                    <div className="max-h-[100px] overflow-y-auto">
                      <div className="space-y-1">
                        {getPatientsWithTemplateList().map((patient) => (
                          <div key={patient.id} className="text-sm">
                            • {patient.fname} {patient.lname} (MRN: {patient.mrn})
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">These patients cannot be selected again.</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Due Date Override */}
            <div className="space-y-2">
              <Label htmlFor="assignDueDate">Due Date (Optional - overrides template default)</Label>
              <Input
                id="assignDueDate"
                type="date"
                value={assignDueDate ? format(assignDueDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setAssignDueDate(new Date(e.target.value))
                  } else {
                    setAssignDueDate(undefined)
                  }
                }}
                className="w-full"
              />
            </div>

            {/* Tabs for Browse vs Serial Number */}
            <Tabs value={assignmentTab} onValueChange={(v) => setAssignmentTab(v as 'browse' | 'serial')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="browse">Browse Patients</TabsTrigger>
                <TabsTrigger value="serial">By Serial Number</TabsTrigger>
              </TabsList>

              {/* Browse Patients Tab */}
              <TabsContent value="browse" className="space-y-4">
                {/* Patient Search Popover */}
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
                          {patients.filter(p => !selectedPatients.includes(p.id) && !patientsWithTemplate.includes(p.id)).length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                              {patientSearch ? 'No patients found.' : 'All available patients selected.'}
                            </div>
                          ) : (
                            <div className="divide-y">
                              {patients
                                .filter(p => !selectedPatients.includes(p.id) && !patientsWithTemplate.includes(p.id))
                                .map((patient) => (
                                  <div
                                    key={patient.id}
                                    className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                                    onClick={() => selectPatient(patient)}
                                  >
                                    <Checkbox 
                                      checked={false}
                                      className="pointer-events-none"
                                    />
                                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">
                                        {patient.fname} {patient.lname}
                                      </div>
                                      <div className="text-sm text-muted-foreground truncate">
                                        MRN: {patient.mrn} {patient.dob && `• DOB: ${format(new Date(patient.dob), 'MMM d, yyyy')}`}
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

                {/* Selected Patients List */}
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

              {/* Serial Number Tab */}
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

                {/* Search Results */}
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
                              patientsWithTemplate.includes(match.patientId!) ? (
                                <>
                                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                                  <div className="flex-1">
                                    <p className="font-medium">{match.patientName}</p>
                                    <p className="text-sm text-orange-600">
                                      Already has this template assigned
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <div className="flex-1">
                                    <p className="font-medium">{match.patientName}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Serial: {match.serialNumber} ({match.deviceType})
                                    </p>
                                  </div>
                                </>
                              )
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

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAssignDialogOpen(false)
                  setSerialNumberText('')
                  setSerialMatches([])
                  setSelectedPatients([])
                  setSelectedPatientObjects([])
                  setPatientsWithTemplate([])
                  setPatientSearch('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignSubmit}
                disabled={isAssigning || selectedPatients.length === 0}
              >
                {isAssigning ? 'Assigning...' : `Assign to ${selectedPatients.length} Patient(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function getPriorityColor(priority: string) {
  const colors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500'
  }
  return colors[priority as keyof typeof colors] || 'bg-gray-500'
}