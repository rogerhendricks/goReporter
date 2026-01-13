import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { List } from 'react-window'
import { timelineService, type TimelineEvent, type TimelineStats } from '@/services/timelineService'
import type { Task } from '@/stores/taskStore'
import type { PatientNote } from '@/services/patientNoteService'
import type { Report } from '@/stores/reportStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, Circle, FileText, MessageSquare, ClipboardList, ExternalLink, Filter, CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { DateRange } from 'react-day-picker'

interface PatientTimelineProps {
  patientId: number
}

export function PatientTimeline({ patientId }: PatientTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TimelineStats | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'task' | 'note' | 'report'>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const listRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)

  useEffect(() => {
    loadTimeline(true)
    loadStats()
  }, [patientId, filterType, dateRange])

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const availableHeight = window.innerHeight - rect.top - 100
        setContainerHeight(Math.min(Math.max(availableHeight, 400), 800))
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const loadTimeline = async (reset: boolean = false) => {
    try {
      setLoading(true)
      const currentPage = reset ? 1 : page
      
      const filters: any = {
        page: currentPage,
        limit: 20,
        type: filterType
      }

      if (dateRange?.from) {
        filters.startDate = format(dateRange.from, 'yyyy-MM-dd')
      }
      if (dateRange?.to) {
        filters.endDate = format(dateRange.to, 'yyyy-MM-dd')
      }

      const response = await timelineService.getPatientTimeline(patientId, filters)
      
      if (reset) {
        setEvents(response.events)
        setPage(2)
      } else {
        setEvents(prev => [...prev, ...response.events])
        setPage(currentPage + 1)
      }
      
      setTotalCount(response.total)
      setHasMore(response.hasMore)
    } catch (error) {
      console.error('Failed to load timeline:', error)
      toast.error('Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await timelineService.getPatientTimelineStats(patientId)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load timeline stats:', error)
    }
  }

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadTimeline(false)
    }
  }, [loading, hasMore, page])

  const handleFilterChange = (value: 'all' | 'task' | 'note' | 'report') => {
    setFilterType(value)
    setEvents([])
    setPage(1)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    setEvents([])
    setPage(1)
  }

  const clearDateRange = () => {
    setDateRange(undefined)
    setEvents([])
    setPage(1)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPpp')
    } catch {
      return dateString
    }
  }

  const renderTaskEvent = (task: Task) => {
    const isCompleted = task.status === 'completed'
    
    return (
      <div className="flex gap-3 items-start">
        <div className="mt-1">
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-blue-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <HoverCard>
            <HoverCardTrigger asChild>
              <div className="cursor-help">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Task: {task.title}</span>
                </div>
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-96" align="start">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm">{task.title}</h4>
                  <Link 
                    to={`/tasks/${task.id}`}
                    className="text-primary hover:underline text-xs flex items-center gap-1"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Badge variant={isCompleted ? 'default' : 'secondary'}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline">{task.priority}</Badge>
                  {task.dueDate && (
                    <Badge variant="outline">
                      Due: {formatDate(task.dueDate)}
                    </Badge>
                  )}
                </div>
                {task.assignedTo && (
                  <div className="text-xs text-muted-foreground pt-1">
                    Assigned to: {task.assignedTo.fullName}
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-1 border-t">
                  Created by {task.createdBy.fullName} on {formatDateTime(task.createdAt)}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-xs">
              {task.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="text-xs">{task.priority}</Badge>
            <Link 
              to={`/tasks/${task.id}`}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View task <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const renderNoteEvent = (note: PatientNote) => {
    return (
      <div className="flex gap-3 items-start">
        <div className="mt-1">
          <MessageSquare className="h-5 w-5 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <HoverCard>
            <HoverCardTrigger asChild>
              <div className="cursor-help">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Patient Note</span>
                </div>
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-96" align="start">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm">Patient Note</h4>
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {note.content}
                </p>
                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>By: {note.user.fullName}</span>
                  <span>{formatDateTime(note.createdAt)}</span>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>
    )
  }

  const renderReportEvent = (report: Report) => {
    return (
      <div className="flex gap-3 items-start">
        <div className="mt-1">
          <FileText className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">Report: {report.reportType}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {report.reportStatus}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {report.reportType}
                </Badge>
                <Link 
                  to={`/patients/${patientId}/reports/${report.id}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View report <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const Row = ({ index, style, ariaAttributes }: { 
    index: number; 
    style: React.CSSProperties;
    ariaAttributes: {
      'aria-posinset': number;
      'aria-setsize': number;
      role: 'listitem';
    };
  }) => {
    const event = events[index]
    if (!event) return null
    
    const isLeft = index % 2 === 0

    // Trigger load more when near the end
    if (index === events.length - 5 && hasMore && !loading) {
      handleLoadMore()
    }

    return (
      <div style={style} {...ariaAttributes}>
        <div className={`relative flex ${isLeft ? 'justify-end' : 'justify-start'} mb-8`}>
          {/* Date badge - centered on timeline */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 z-10">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background border-2 border-border">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          </div>
          
          {/* Event content - left or right side */}
          <div className={`w-[calc(50%-2rem)] ${isLeft ? 'pl-8' : 'pr-8'}`}>
            <div className="bg-card border rounded-lg p-4 shadow-sm">
              <div className={`text-xs text-muted-foreground mb-2 ${isLeft ? 'text-left' : 'text-right'}`}>
                {formatDateTime(event.date)}
              </div>
              
              {event.type === 'task' && renderTaskEvent(event.data as Task)}
              {event.type === 'note' && renderNoteEvent(event.data as PatientNote)}
              {event.type === 'report' && renderReportEvent(event.data as Report)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading && events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading timeline...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!loading && events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Timeline</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="note">Notes</SelectItem>
                  <SelectItem value="report">Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No timeline events found
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle>
              Timeline ({totalCount} {filterType === 'all' ? 'events' : `${filterType}s`})
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Date Range Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      'Date Range'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    numberOfMonths={2}
                  />
                  {dateRange && (
                    <div className="p-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearDateRange}
                        className="w-full gap-2"
                      >
                        <X className="h-4 w-4" />
                        Clear Date Range
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Type Filter */}
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events {stats && `(${stats.taskCount + stats.noteCount + stats.reportCount})`}</SelectItem>
                  <SelectItem value="task">Tasks {stats && `(${stats.taskCount})`}</SelectItem>
                  <SelectItem value="note">Notes {stats && `(${stats.noteCount})`}</SelectItem>
                  <SelectItem value="report">Reports {stats && `(${stats.reportCount})`}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="relative">
          {/* Timeline line - centered */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2 z-0" />
          
          {/* Virtual scrolling list */}
          <List
            listRef={listRef}
            style={{ height: containerHeight, width: '100%' }}
            rowCount={events.length}
            rowHeight={220}
            rowComponent={Row}
            rowProps={{}}
            className="timeline-scroll"
          />

          {/* Loading indicator */}
          {loading && events.length > 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Loading more events...
            </div>
          )}

          {/* No more events */}
          {!hasMore && events.length > 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No more events to load
            </div>
          )}
        </div>
        
        {/* Summary Stats */}
        {stats && filterType === 'all' && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span>{stats.taskCount} Tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>{stats.noteCount} Notes</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{stats.reportCount} Reports</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
