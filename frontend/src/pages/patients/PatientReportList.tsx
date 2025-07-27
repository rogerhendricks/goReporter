import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReportStore } from '@/stores/reportStore'
import { usePatientStore } from '@/stores/patientStore'
import { useReportPdfHandler } from '@/hooks/useReportPdfHandler'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Plus, Edit, Trash2, FileText, CheckCircle2, XCircle, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function PatientReportList() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { reports, loading, fetchReportsForPatient, deleteReport } = useReportStore()
  const { currentPatient, fetchPatient } = usePatientStore()
  const { viewReportPdf, isProcessing } = useReportPdfHandler()

  const handleViewPdf = (reportId: number) => {
    if (currentPatient) {
      viewReportPdf(reportId, currentPatient)
    }
  }

  useEffect(() => {
    if (patientId) {
      fetchReportsForPatient(parseInt(patientId))
      fetchPatient(parseInt(patientId))
    }
  }, [patientId, fetchReportsForPatient, fetchPatient])

  const handleDelete = async (reportId: number) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      await deleteReport(reportId)
    }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Patients', href: '/patients' },
    { label: currentPatient?.fname || 'Patient', href: `/patients/${patientId}` },
    { label: 'Reports', current: true }
  ]

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reports for {currentPatient?.fname} {currentPatient?.lname}</h1>
        <Button onClick={() => navigate(`/patients/${patientId}/reports/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Create New Report
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>All Reports ({reports.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{formatDate(report.reportDate)}</TableCell>
                    <TableCell>{report.reportType}</TableCell>
                    <TableCell>
                      <Badge variant={report.reportStatus === 'pending' ? 'secondary' : 'default'}>
                        {report.reportStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {report.isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewPdf(report.id)}
                        disabled={isProcessing}
                        title="View/Download PDF"
                      >
                        {isProcessing ? <Download className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/reports/${report.id}/edit`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(report.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}