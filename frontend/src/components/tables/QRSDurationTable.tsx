import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Report } from '@/types'

interface QRSDurationTableProps {
  reports: Report[]
}

export function QRSDurationTable({ reports }: QRSDurationTableProps) {
  const qrsReports = reports.filter(report => report.qrs_duration !== null)
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QRS Duration Measurements ({qrsReports.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {qrsReports.length === 0 ? (
          <p className="text-muted-foreground">No QRS duration measurements available</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Date</TableHead>
                <TableHead>Report Type</TableHead>
                <TableHead>QRS Duration (ms)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qrsReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{formatDate(report.reportDate)}</TableCell>
                  <TableCell>{report.reportType}</TableCell>
                  <TableCell className="font-medium">{report.qrs_duration}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(report.reportStatus)}>
                      {report.reportStatus || 'Unknown'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}