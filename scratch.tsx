import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/stores/taskStore'
import type { TaskStatus, TaskPriority} from '@/stores/taskStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, CheckCircle2, Circle, Clock, User, AlertCircle, Plus } from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { cn } from '@/lib/utils'

interface TaskListProps {
  patientId?: number
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

export function TaskList({ patientId, showFilters = true }: TaskListProps) {
  const navigate = useNavigate()
  const { tasks, fetchTasks, fetchTasksByPatient, isLoading } = useTaskStore()
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')

  useEffect(() => {
    const loadTasks = async () => {
      const filters: any = {}
      
      if (statusFilter !== 'all') filters.status = statusFilter
      if (priorityFilter !== 'all') filters.priority = priorityFilter
      if (patientId) filters.patientId = patientId

      if (patientId) {
        await fetchTasksByPatient(patientId)
      } else {
        await fetchTasks(filters)
      }
    }

    loadTasks()
  }, [patientId, statusFilter, priorityFilter, fetchTasks, fetchTasksByPatient])

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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <div className="flex items-center gap-2">
          {showFilters && (
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
            </>
          )}
          <Button onClick={() => navigate(patientId ? `/patients/${patientId}/tasks/new` : '/tasks/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

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
              <div className="space-y-2">
                {groupedTasks.overdue.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Today's Tasks */}
          {groupedTasks.today.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today ({groupedTasks.today.length})
              </h3>
              <div className="space-y-2">
                {groupedTasks.today.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Tasks */}
          {groupedTasks.upcoming.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Upcoming ({groupedTasks.upcoming.length})
              </h3>
              <div className="space-y-2">
                {groupedTasks.upcoming.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {groupedTasks.completed.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Completed ({groupedTasks.completed.length})
              </h3>
              <div className="space-y-2">
                {groupedTasks.completed.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: {
    id: number
    title: string
    description?: string
    status: TaskStatus
    priority: TaskPriority
    dueDate?: string
    patient?: {
      fname: string
      lname: string
    }
    assignedTo?: {
      fname: string
      lname: string
    }
    tags?: Array<{
      ID: number
      name: string
      color: string
    }>
  }
}

function TaskCard({ task }: TaskCardProps) {
  const navigate = useNavigate()
  const dueDateInfo = getDueDateInfo(task.dueDate)
  const PriorityIcon = priorityConfig[task.priority].icon
  const StatusIcon = statusConfig[task.status].icon

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{task.title}</h3>
              <Badge className={cn("text-white", priorityConfig[task.priority].color)}>
                <PriorityIcon className="h-3 w-3 mr-1" />
                {priorityConfig[task.priority].label}
              </Badge>
              <Badge variant="outline" className={statusConfig[task.status].color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[task.status].label}
              </Badge>
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {dueDateInfo && (
                <div className={cn(
                  "flex items-center gap-1",
                  dueDateInfo.isOverdue && "text-red-600 font-semibold"
                )}>
                  <Calendar className="h-4 w-4" />
                  {dueDateInfo.text}
                </div>
              )}

              {task.patient && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {task.patient.fname} {task.patient.lname}
                </div>
              )}

              {task.assignedTo && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Assigned to: {task.assignedTo.fname} {task.assignedTo.lname}
                </div>
              )}
            </div>

            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
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
        </div>
      </CardContent>
    </Card>
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