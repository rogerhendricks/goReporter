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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Plus, Edit2, Trash2, X } from 'lucide-react'
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

  return (
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
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No templates found. Create your first template to get started.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id} className="text-left">
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.title}</div>
                        {template.taskDescription && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {template.taskDescription}
                          </div>
                        )}
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