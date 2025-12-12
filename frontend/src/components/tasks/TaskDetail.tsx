import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/stores/taskStore'
import { useUserStore } from '@/stores/userStore' 
import type { UpdateTaskData } from '@/stores/taskStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar as CalendarIcon, User, Clock, Edit2, Trash2, Save, X, MessageSquare, Edit, Check } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { useAuthStore } from '@/stores/authStore'

export function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTask, fetchTask, updateTask, deleteTask, addNote, updateNote, deleteNote, isLoading } = useTaskStore()
  const { users, fetchUsers } = useUserStore()
  const { user } = useAuthStore() 
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<UpdateTaskData>({})
  const [newNote, setNewNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')

  const isAdminOrDoctor = user?.role === 'admin' || user?.role === 'doctor'

  useEffect(() => {
    if (id) {
      fetchTask(parseInt(id))
      fetchUsers()
    }
  }, [id, fetchTask, fetchUsers])

  useEffect(() => {
    if (currentTask && !isEditing) {
      setEditData({
        title: currentTask.title,
        description: currentTask.description,
        status: currentTask.status,
        priority: currentTask.priority,
        assignedToId: currentTask.assignedToId,
      })
    }
  }, [currentTask, isEditing])

  const handleUpdate = async () => {
    if (!currentTask) return

    const result = await updateTask(currentTask.id, editData)
    if (result) {
      toast.success('Task updated successfully')
      setIsEditing(false)
    } else {
      toast.error('Failed to update task')
    }
  }

  const handleDelete = async () => {
    if (!currentTask) return
    
    if (window.confirm('Are you sure you want to delete this task?')) {
      const result = await deleteTask(currentTask.id)
      if (result) {
        toast.success('Task deleted successfully')
        navigate('/tasks')
      } else {
        toast.error('Failed to delete task')
      }
    }
  }

  const handleAddNote = async () => {
    if (!currentTask || !newNote.trim()) return

    const result = await addNote(currentTask.id, newNote.trim())
    if (result) {
      toast.success('Note added successfully')
      setNewNote('')
      fetchTask(currentTask.id) // Refresh to get updated notes
    } else {
      toast.error('Failed to add note')
    }
  }

  const handleEditNote = (noteId: number, content: string) => {
    setEditingNoteId(noteId)
    setEditingNoteContent(content)
  }

  const handleUpdateNote = async (noteId: number) => {
    if (!currentTask || !editingNoteContent.trim()) return
    const result = await updateNote(currentTask.id, noteId, editingNoteContent.trim())
    if (result) {
      toast.success('Note updated successfully')
      setEditingNoteId(null)
      setEditingNoteContent('')
    } else {
      toast.error('Failed to update note')
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!currentTask) return
    if (window.confirm('Are you sure you want to delete this note?')) {
      const result = await deleteNote(currentTask.id, noteId)
      if (result) {
        toast.success('Note deleted successfully')
      } else {
        toast.error('Failed to delete note')
      }
    }
  }

  const handleCancelEditNote = () => {
    setEditingNoteId(null)
    setEditingNoteContent('')
  }

  if (isLoading && !currentTask) {
    return <div className="container mx-auto py-6">Loading...</div>
  }

  if (isLoading && !currentTask) {
    return <div className="container mx-auto py-6">Loading...</div>
  }

  if (!currentTask) {
    return <div className="container mx-auto py-6">Task not found</div>
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Tasks', href: '/tasks' },
    { label: currentTask.title, current: true }
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BreadcrumbNav items={breadcrumbItems} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Task Details</h1>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleUpdate}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={editData.status}
                        onValueChange={(value: any) => setEditData({ ...editData, status: value })}
                      >
                        <SelectTrigger>
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

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={editData.priority}
                        onValueChange={(value: any) => setEditData({ ...editData, priority: value })}
                      >
                        <SelectTrigger>
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
                  </div>
                {/* Only show Assign To field for admin/doctor */}
                  {isAdminOrDoctor && (
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select
                        value={editData.assignedToId?.toString() || "unassigned"}
                        onValueChange={(value) => setEditData({ 
                          ...editData, 
                          assignedToId: value === "unassigned" ? undefined : parseInt(value) 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.ID} value={u.ID.toString()}>
                              {u.fullName || u.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">{currentTask.title}</h2>
                    {currentTask.description && (
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {currentTask.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(currentTask.priority)}>
                      {currentTask.priority}
                    </Badge>
                    <Badge variant="outline">{currentTask.status.replace('_', ' ')}</Badge>
                  </div>

                  {currentTask.tags && currentTask.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {currentTask.tags.map((tag) => (
                        <Badge
                          key={tag.ID}
                          variant="outline"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notes ({currentTask.notes?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  />
                <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                  Add Note
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                {currentTask.notes && currentTask.notes.length > 0 ? (
                  currentTask.notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-4">
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingNoteContent}
                            onChange={(e) => setEditingNoteContent(e.target.value)}
                            rows={3}
                            />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateNote(note.id)}>
                              <Check className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEditNote}>
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap mb-2">{note.content}</p>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              <span className="font-semibold">
                                {note.createdBy.username}
                              </span>
                              {' • '}
                              {format(new Date(note.createdAt), 'PPp')}
                              {note.updatedAt && note.updatedAt !== note.createdAt && (
                                <>
                                  {' • '}
                                  <span className="italic">
                                    Edited {format(new Date(note.updatedAt), 'PPp')}
                                    {note.updatedByUser && ` by ${note.updatedByUser.username}`}
                                  </span>
                                </>
                              )}
                            </div>
                            {user && Number(user.ID) === note.createdBy.ID && (
                              // display the note.createdBy.id
                              
                              <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditNote(note.id, note.content)}
                                >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No notes yet. Add the first note above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentTask.dueDate && (
                <div className="flex items-start gap-2">
                  <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Due Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(currentTask.dueDate), 'PPP')}
                    </p>
                  </div>
                </div>
              )}

              {currentTask.patient && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Patient</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => navigate(`/patients/${currentTask.patient?.id}`)}
                    >
                      <p className="text-sm text-muted-foreground">
                        {currentTask.patient.fname} {currentTask.patient.lname}
                      </p>
                    </Button>
                  </div>
                </div>
              )}

              {currentTask.assignedTo && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Assigned</p>
                    <p className="text-sm text-muted-foreground">
                      {currentTask.assignedTo.username}
                    </p>
                  </div>
                </div>
              )}



              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(currentTask.createdAt), 'PPp')} by {currentTask.createdBy.username}
                  </p>
                </div>
              </div>

              {currentTask.completedAt && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Completed</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(currentTask.completedAt), 'PPp')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
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