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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, UserPlus, CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { tagService } from '@/services/tagService'
import { usePatientStore } from '@/stores/patientStore'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface TaskTemplate {
  id: number
  name: string
  description: string
  title: string
  taskDescription: string
  priority: string
  daysUntilDue?: number
  tags: any[]
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
  const [assignDueDate, setAssignDueDate] = useState<Date>()
  const [isAssigning, setIsAssigning] = useState(false)
  const [patientSearchOpen, setPatientSearchOpen] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  
  const { patients, fetchPatients } = usePatientStore()

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
      tagIds: template.tags.map(t => t.ID)
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return

    try {
      await axios.delete(`/task-templates/${id}`)
      toast.success('Template deleted successfully')
      loadTemplates()
    } catch (error) {
      toast.error('Failed to delete template')
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

  const handleAssignToPatients = (template: TaskTemplate) => {
    setSelectedTemplate(template)
    setSelectedPatients([])
    setAssignDueDate(undefined)
    setIsAssignDialogOpen(true)
  }

  const togglePatientSelection = (patientId: number) => {
    setSelectedPatients(prev =>
      prev.includes(patientId)
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    )
  }

  const handleAssignSubmit = async () => {
    if (!selectedTemplate || selectedPatients.length === 0) {
      toast.error('Please select at least one patient')
      return
    }

    setIsAssigning(true)
    try {
      const promises = selectedPatients.map(patientId =>
        axios.post(`/task-templates/${selectedTemplate.id}/assign`, {
          patientId,
          dueDate: assignDueDate ? format(assignDueDate, 'yyyy-MM-dd') : undefined
        })
      )

      await Promise.all(promises)
      toast.success(`Template assigned to ${selectedPatients.length} patient(s)`)
      setIsAssignDialogOpen(false)
      setSelectedTemplate(null)
      setSelectedPatients([])
      setAssignDueDate(undefined)
    } catch (error) {
      toast.error('Failed to assign template to patients')
    } finally {
      setIsAssigning(false)
    }
  }

  const filteredPatients = patients.filter(p =>
    patientSearch === '' ||
    `${p.fname} ${p.lname}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mrn.toLowerCase().includes(patientSearch.toLowerCase())
  )

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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

            {/* Due Date Override */}
            <div className="space-y-2">
              <Label>Due Date (Optional - overrides template default)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !assignDueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {assignDueDate ? format(assignDueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={assignDueDate}
                    onSelect={setAssignDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Patient Search */}
            <div className="space-y-2">
              <Label>Search Patients</Label>
              <Input
                placeholder="Search by name or MRN..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>

            {/* Patient Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Patients ({selectedPatients.length} selected)</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPatients(filteredPatients.map(p => p.id))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPatients([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No patients found
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center space-x-3 p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => togglePatientSelection(patient.id)}
                      >
                        <Checkbox
                          checked={selectedPatients.includes(patient.id)}
                          onCheckedChange={() => togglePatientSelection(patient.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">
                            {patient.fname} {patient.lname}
                          </p>
                          <p className="text-sm text-muted-foreground">MRN: {patient.mrn}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
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