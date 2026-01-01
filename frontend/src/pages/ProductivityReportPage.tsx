import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DonutChart } from '@/components/charts/DonutChart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, TrendingUp, Clock, CheckCircle2, Users } from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ProductivityReport, TeamProductivityReport } from '@/services/productivityService'
import { productivityService } from '@/services/productivityService'
import { DonutChartSkeleton } from '@/components/ui/loading-skeletons'
import { toast } from 'sonner'

type DateRange = {
  from: Date
  to: Date
}

export default function ProductivityReportPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [myReport, setMyReport] = useState<ProductivityReport | null>(null)
  const [teamReport, setTeamReport] = useState<TeamProductivityReport | null>(null)
  const [allTeamsReports, setAllTeamsReports] = useState<TeamProductivityReport[]>([])
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date())
  })
  const [viewMode, setViewMode] = useState<'my' | 'team' | 'teams'>('my')

  const isManager = user?.role === 'admin'

  useEffect(() => {
    loadReports()
  }, [dateRange, viewMode])

  const loadReports = async () => {
    setLoading(true)
    try {
      const params = {
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd')
      }

      if (viewMode === 'my') {
        const report = await productivityService.getMyReport(params)
        setMyReport(report)
      } else if (viewMode === 'team' && isManager) {
        const report = await productivityService.getTeamReport(params)
        setTeamReport(report)
      } else if (viewMode === 'teams' && isManager) {
        const reports = await productivityService.getAllTeamsProductivity(params)
        setAllTeamsReports(reports)
      }
    } catch (error) {
      console.error('Failed to load productivity report:', error)
      toast.error('Failed to load productivity report')
    } finally {
      setLoading(false)
    }
  }

  const setQuickDateRange = (days: number) => {
    const to = new Date()
    const from = subDays(to, days)
    setDateRange({ from, to })
  }

  const formatHours = (hours: number) => {
    if (hours < 24) {
      return `${hours.toFixed(1)} hrs`
    }
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours.toFixed(1)}h`
  }

  const calculateOnTimeRate = (report: ProductivityReport) => {
    const total = report.onTimeCompletions + report.lateCompletions
    if (total === 0) return 0
    return ((report.onTimeCompletions / total) * 100).toFixed(1)
  }

  return (
    <div className="container mx-auto space-y-6">
      <BreadcrumbNav
        items={[
          { label: 'Home', href: '/' },
          { label: 'Productivity Reports' }
        ]}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productivity Reports</h1>
          <p className="text-muted-foreground">
            Track task completion and performance metrics
          </p>
        </div>

        {/* View Mode Toggle */}
        {isManager && (
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'my' ? 'default' : 'outline'}
              onClick={() => setViewMode('my')}
            >
              My Report
            </Button>
            <Button
              variant={viewMode === 'team' ? 'default' : 'outline'}
              onClick={() => setViewMode('team')}
            >
              <Users className="w-4 h-4 mr-2" />
              Team Report
            </Button>
            <Button
              variant={viewMode === 'teams' ? 'default' : 'outline'}
              onClick={() => setViewMode('teams')}
            >
              <Users className="w-4 h-4 mr-2" />
              All Teams
            </Button>
          </div>
        )}
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Select a date range for the report</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickDateRange(7)}
          >
            Last 7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickDateRange(30)}
          >
            Last 30 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickDateRange(90)}
          >
            Last 90 Days
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'LLL dd, y')} -{' '}
                      {format(dateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to })
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* My Report View */}
      {viewMode === 'my' && myReport && !loading && (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tasks Completed
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myReport.totalTasksCompleted}</div>
                <p className="text-xs text-muted-foreground">
                  {myReport.tasksCreated} tasks created
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Reports Completed
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myReport.reportsCompleted}</div>
                <p className="text-xs text-muted-foreground">
                  {myReport.reportsCreated} created, {myReport.reportsPending} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  On-Time Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{calculateOnTimeRate(myReport)}%</div>
                <p className="text-xs text-muted-foreground">
                  {myReport.onTimeCompletions} on time, {myReport.lateCompletions} late
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Completion Time
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatHours(myReport.averageCompletionTime)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per task average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-medium">{myReport.tasksByStatus.pending}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">In Progress</span>
                    <span className="font-medium">{myReport.tasksByStatus.inProgress}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-[300px]">
              <DonutChart
                title="Tasks by Priority"
                slices={[
                  { label: 'Urgent', count: myReport.tasksByPriority.urgent },
                  { label: 'High', count: myReport.tasksByPriority.high },
                  { label: 'Medium', count: myReport.tasksByPriority.medium },
                  { label: 'Low', count: myReport.tasksByPriority.low }
                ].filter(s => s.count > 0)}
              />
            </div>
            <div className="h-[300px]">
              <DonutChart
                title="Tasks by Status"
                slices={[
                  { label: 'Completed', count: myReport.tasksByStatus.completed },
                  { label: 'In Progress', count: myReport.tasksByStatus.inProgress },
                  { label: 'Pending', count: myReport.tasksByStatus.pending },
                  { label: 'Cancelled', count: myReport.tasksByStatus.cancelled }
                ].filter(s => s.count > 0)}
              />
            </div>
          </div>

          {/* Top Patients Table */}
          {myReport.topPatients && myReport.topPatients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Patients by Task Count</CardTitle>
                <CardDescription>
                  Patients with the most completed tasks in this period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient Name</TableHead>
                      <TableHead className="text-right">Tasks Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myReport.topPatients.map((patient) => (
                      <TableRow key={patient.patientId}>
                        <TableCell className="font-medium">
                          {patient.patientName}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{patient.taskCount}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Team Report View */}
      {viewMode === 'team' && teamReport && !loading && (
        <>
          {/* Team Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Team Tasks
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamReport.totalTasksCompleted}</div>
                <p className="text-xs text-muted-foreground">
                  {teamReport.totalTasksCreated} tasks created
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Reports Completed
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamReport.totalReportsCompleted}</div>
                <p className="text-xs text-muted-foreground">
                  {teamReport.totalReportsCreated} created, {teamReport.totalReportsPending} pending
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Members
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamReport.teamMembers.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active team members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Completion Time
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatHours(teamReport.teamAverageCompletionTime)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Team average
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>
                Team members with highest task completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead className="text-right">Tasks Completed</TableHead>
                    <TableHead className="text-right">On-Time Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamReport.topPerformers.map((performer) => (
                    <TableRow key={performer.userId}>
                      <TableCell className="font-medium">
                        {performer.fullName || performer.username}
                      </TableCell>
                      <TableCell>{performer.username}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{performer.totalTasksCompleted}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={performer.onTimeRate >= 80 ? 'default' : 'destructive'}
                        >
                          {performer.onTimeRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Team Members Detail */}
          <Card>
            <CardHeader>
              <CardTitle>Team Member Details</CardTitle>
              <CardDescription>
                Individual performance breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">On Time</TableHead>
                    <TableHead className="text-right">Late</TableHead>
                    <TableHead className="text-right">Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamReport.teamMembers.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell className="font-medium">
                        {member.fullName || member.username}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.totalTasksCompleted}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 dark:text-green-400">
                          {member.onTimeCompletions}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-red-600 dark:text-red-400">
                          {member.lateCompletions}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatHours(member.averageCompletionTime)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* All Teams Comparison View */}
      {viewMode === 'teams' && allTeamsReports && !loading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Comparison</CardTitle>
              <CardDescription>
                Compare productivity metrics across all teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead className="text-right">Tasks Completed</TableHead>
                    <TableHead className="text-right">Reports Completed</TableHead>
                    <TableHead className="text-right">Team Members</TableHead>
                    <TableHead className="text-right">Avg Completion Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTeamsReports.map((report) => (
                    <TableRow key={report.managerId}>
                      <TableCell className="font-medium">{report.managerName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{report.totalTasksCompleted}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default">{report.totalReportsCompleted}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{report.teamMembers.length}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatHours(report.teamAverageCompletionTime)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Detailed Team Breakdown */}
          {allTeamsReports.map((report) => (
            <Card key={report.managerId}>
              <CardHeader>
                <CardTitle>{report.managerName} - Detailed Breakdown</CardTitle>
                <CardDescription>
                  Performance metrics for team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Tasks</div>
                    <div className="text-2xl font-bold">{report.totalTasksCompleted}</div>
                    <div className="text-xs text-muted-foreground">{report.totalTasksCreated} created</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Reports</div>
                    <div className="text-2xl font-bold">{report.totalReportsCompleted}</div>
                    <div className="text-xs text-muted-foreground">{report.totalReportsPending} pending</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Avg Time</div>
                    <div className="text-2xl font-bold">{formatHours(report.teamAverageCompletionTime)}</div>
                    <div className="text-xs text-muted-foreground">Per task</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-right">Tasks</TableHead>
                      <TableHead className="text-right">Reports</TableHead>
                      <TableHead className="text-right">On Time</TableHead>
                      <TableHead className="text-right">Late</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.teamMembers.map((member) => (
                      <TableRow key={member.userId}>
                        <TableCell className="font-medium">{member.fullName}</TableCell>
                        <TableCell className="text-right">{member.totalTasksCompleted}</TableCell>
                        <TableCell className="text-right">{member.reportsCompleted}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600 dark:text-green-400">
                            {member.onTimeCompletions}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-red-600 dark:text-red-400">
                            {member.lateCompletions}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Loading States */}
      {loading && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24"></div>
                </CardHeader>
                <CardContent className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DonutChartSkeleton />
            <DonutChartSkeleton />
          </div>
        </>
      )}
    </div>
  )
}
