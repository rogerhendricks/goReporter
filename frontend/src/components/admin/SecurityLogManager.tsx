import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, Search, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { securityService, type SecurityLog, type SecurityLogQuery } from '@/services/securityService'
import { toast } from 'sonner'
import { format } from 'date-fns'

export function SecurityLogsDashboard() {
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<SecurityLogQuery>({
    limit: 50,
    page: 1
  })

  useEffect(() => {
    fetchLogs()
  }, [page, filters])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const data = await securityService.getLogs({ ...filters, page })
      setLogs(data.logs)
      setTotal(data.total)
    } catch (error) {
      toast.error('Failed to fetch security logs')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const blob = await securityService.exportLogs(filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `security-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      toast.success('Security logs exported successfully')
    } catch (error) {
      toast.error('Failed to export logs')
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'WARNING':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
      CRITICAL: 'destructive',
      WARNING: 'default',
      INFO: 'secondary'
    }
    return variants[severity] || 'secondary'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Event Logs</CardTitle>
        <CardDescription>
          Monitor and audit security-related events across the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select
              value={filters.eventType || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, eventType: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
                <SelectItem value="DATA_ACCESS">Data Access</SelectItem>
                <SelectItem value="DATA_MODIFICATION">Data Modification</SelectItem>
                <SelectItem value="DATA_DELETION">Data Deletion</SelectItem>
                <SelectItem value="CSRF_VIOLATION">CSRF Violation</SelectItem>
                <SelectItem value="UNAUTHORIZED_ACCESS">Unauthorized Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Severity</Label>
            <Select
              value={filters.severity || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, severity: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>User ID</Label>
            <Input
              placeholder="Filter by user ID"
              value={filters.userId || ''}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={fetchLogs} className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No security logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(log.severity)}
                        <Badge variant={getSeverityBadge(log.severity)}>
                          {log.severity}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.eventType}</Badge>
                    </TableCell>
                    <TableCell>
                      {log.userId || 'Anonymous'}
                    </TableCell>
                    <TableCell>
                      {log.username || 'Anonymous'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ipAddress}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {log.message}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {logs.length} of {total} logs
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * (filters.limit || 50) >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}