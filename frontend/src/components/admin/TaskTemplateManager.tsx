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
import { Plus, Edit2, Trash2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { tagService } from '@/services/tagService'

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

export function TaskTemplateManager() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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
  }, [])

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

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Task Templates</CardTitle>
              <CardDescription>
                Create reusable templates for common tasks
              </CardDescription>
          </div>
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
      </CardHeader>
      <CardContent>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription className="mt-1">
                      {template.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Task Preview:</p>
                <p className="text-sm text-muted-foreground">{template.title}</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={getPriorityColor(template.priority)}>
                  {template.priority}
                </Badge>
                {template.daysUntilDue && (
                  <Badge variant="outline">
                    Due in {template.daysUntilDue} days
                  </Badge>
                )}
              </div>

              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {template.tags.map((tag) => (
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
            </CardContent>
          </Card>
        ))}
      </div>
      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No templates yet. Create your first template to get started.
            </p>
          </CardContent>
        </Card>
      )}
      </CardContent>
    </Card>
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