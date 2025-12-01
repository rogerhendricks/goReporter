import { useState, useEffect } from 'react'
import { taskTemplateService, TaskTemplate } from '@/services/taskTemplateService'
import { useTaskStore } from '@/stores/taskStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, ListChecks } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TaskTemplateSelectorProps {
  patientId: number
  onSuccess?: () => void
}

export function TaskTemplateSelector({ patientId, onSuccess }: TaskTemplateSelectorProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [dueDate, setDueDate] = useState<Date>()
  const [isLoading, setIsLoading] = useState(false)
  const { fetchTasksForPatient } = useTaskStore()

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const loadTemplates = async () => {
    try {
      const data = await taskTemplateService.getAll()
      setTemplates(data)
    } catch (error) {
      toast.error('Failed to load task templates')
    }
  }

  const handleAssign = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template')
      return
    }

    setIsLoading(true)
    try {
      await taskTemplateService.assignToPatient(
        patientId,
        parseInt(selectedTemplate),
        dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined
      )
      
      toast.success('Task created from template')
      await fetchTasksForPatient(patientId)
      
      setOpen(false)
      setSelectedTemplate('')
      setDueDate(undefined)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast.error('Failed to create task from template')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedTemplateData = templates.find(t => t.id === parseInt(selectedTemplate))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ListChecks className="mr-2 h-4 w-4" />
          Create from Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Task from Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
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

          {selectedTemplateData && (
            <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
              <div>
                <p className="text-sm font-medium">Title:</p>
                <p className="text-sm text-muted-foreground">{selectedTemplateData.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Description:</p>
                <p className="text-sm text-muted-foreground">{selectedTemplateData.taskDescription}</p>
              </div>
              <div className="flex gap-2">
                <Badge>{selectedTemplateData.priority}</Badge>
                {selectedTemplateData.daysUntilDue && (
                  <Badge variant="outline">Due in {selectedTemplateData.daysUntilDue} days</Badge>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={isLoading || !selectedTemplate}>
              {isLoading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}