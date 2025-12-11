import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/stores/taskStore'
import type { TaskStatus, TaskPriority, Task } from '@/stores/taskStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, CheckCircle2, Circle, Clock, User, AlertCircle, Plus, Eye, Trash2, HelpCircle } from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
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
import axios from '@/utils/axios'

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
  const [users, setUsers] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')

  useEffect(() => {
    if (isAdmin) {
      const loadUsers = async () => {
        try {
          const response = await axios.get('/users')
          setUsers(response.data)
        } catch (error) {
          console.error('Failed to load users', error)
        }
      }
      loadUsers()
    }
  }, [isAdmin])

  useEffect(() => {
    const loadTasks = async () => {
      const filters: any = {}
      
      if (statusFilter !== 'all') filters.status = statusFilter
      if (priorityFilter !== 'all') filters.priority = priorityFilter
      if (patientId) filters.patientId = patientId
      if (assignedToId) filters.assignedTo = assignedToId 

      if (patientId) {
        await fetchTasksByPatient(patientId)
      } else {
        await fetchTasks(filters)
      }
    }

    loadTasks()
  }, [patientId, assignedToId, statusFilter, priorityFilter, fetchTasks, fetchTasksByPatient])

  const getDueDateInfo = (dueDate?: string) => {
    if (!dueDate) return null

    const date = new Date(dueDate)
    const isOverdue = isPast(date) && !isToday(date)

    return {
      text: isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'MMM d, yyyy'),
      isOverdue,
      date
    }
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

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
    return true
  })

  const groupedTasks = {
    overdue: filteredTasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed'),
    today: filteredTasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'completed'),
    upcoming: filteredTasks.filter(t => !t.dueDate || (!isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)))),
    completed: filteredTasks.filter(t => t.status === 'completed')
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Header with Filters */}
      {showFilters && (
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <div className="flex items-center gap-2">
            <>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}>
                <SelectTrigger className="w-[150px]">
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
                <SelectTrigger className="w-[150px]">
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
              <Button onClick={() => navigate(patientId ? `/patients/${patientId}/tasks/new` : '/tasks/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </>
          </div>
        </div>
          )}

      {isLoading ? (
        <div className="text-center py-8">Loading tasks...</div>
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
              <TaskTable 
                tasks={groupedTasks.overdue} 
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onDueDateChange={handleDueDateChange}
                onViewTask={(id) => navigate(`/tasks/${id}`)}
                onDeleteTask={handleDeleteTask}
                showPatient={!patientId}
              />
            </div>
          )}

          {/* Today's Tasks */}
          {groupedTasks.today.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today ({groupedTasks.today.length})
              </h3>
              <TaskTable 
                tasks={groupedTasks.today} 
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onDueDateChange={handleDueDateChange}
                onViewTask={(id) => navigate(`/tasks/${id}`)}
                onDeleteTask={handleDeleteTask}
                showPatient={!patientId}
              />
            </div>
          )}

          {/* Upcoming Tasks */}
          {groupedTasks.upcoming.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Upcoming ({groupedTasks.upcoming.length})
              </h3>
              <TaskTable 
                tasks={groupedTasks.upcoming} 
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onDueDateChange={handleDueDateChange}
                onViewTask={(id) => navigate(`/tasks/${id}`)}
                onDeleteTask={handleDeleteTask}
                showPatient={!patientId}
              />
            </div>
          )}

          {/* Completed Tasks */}
          {groupedTasks.completed.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Completed ({groupedTasks.completed.length})
              </h3>
              <TaskTable 
                tasks={groupedTasks.completed} 
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onDueDateChange={handleDueDateChange}
                onViewTask={(id) => navigate(`/tasks/${id}`)}
                onDeleteTask={handleDeleteTask}
                showPatient={!patientId}
              />
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
  onAssigneeChange: (taskId: number, userId: number | null) => void
  onViewTask: (taskId: number) => void
  onDeleteTask: (taskId: number) => void
  showPatient?: boolean
  users: any[]
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
  showPatient = true ,
  users,
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
  onAssigneeChange: (taskId: number, userId: number | null) => void
  onViewTask: (taskId: number) => void
  onDeleteTask: (taskId: number) => void
  showPatient?: boolean
  users: any[]
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
            value={task.assignedToId?.toString() || "unassigned"}
            onValueChange={(value) => onAssigneeChange(task.id, value === "unassigned" ? null : parseInt(value))}
          >
            <SelectTrigger className="w-[150px]">
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
        ) : (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {task.assignedTo ? (task.assignedTo.fullName || task.assignedTo.username) : 'Unassigned'}
            </span>
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