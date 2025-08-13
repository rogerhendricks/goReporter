import { useEffect } from 'react'
import api from '@/utils/axios'
import { useParams, useNavigate } from 'react-router-dom'
import { useReportStore } from '@/stores/reportStore'
import { usePatientStore } from '@/stores/patientStore'
import { useReportPdfHandler } from '@/hooks/useReportPdfHandler'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Plus, Edit, Trash2, FileText, CheckCircle2, XCircle, Download, LinkIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

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

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.startsWith('0001-01-01')) return 'N/A';
    const date = new Date(dateString);
    // Use getUTC methods to ignore the local timezone
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // getUTCMonth is 0-indexed
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

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
        <CardHeader><CardTitle>All Reports ({reports?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading reports...</div>
          ) : reports && reports.length > 0 ? (
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
                    <TableCell className="font-medium text-left">{formatDate(report.reportDate)}</TableCell>
                    <TableCell className="text-left">{report.reportType}</TableCell>
                    <TableCell className="text-left">
                      <Badge variant={report.reportStatus === 'pending' ? 'secondary' : 'default'}>
                        {report.reportStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      {report.isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                    {report.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              // Use axios to fetch the protected file
                              const response = await api.get(report.file_url, {
                                responseType: 'blob',
                              });
                              
                              // Create a blob URL from the response
                              const fileBlob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
                              const url = window.URL.createObjectURL(fileBlob);
                              
                              // Open the blob URL in a new tab
                              window.open(url, '_blank');
                              
                              // Clean up the object URL after a short delay
                              setTimeout(() => window.URL.revokeObjectURL(url), 100);
                            } catch (error) {
                              console.error('Failed to open file:', error);
                              toast.error('Could not open the file.');
                            }
                          }}
                          title="View Uploaded File"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewPdf(report.id)}
                        disabled={isProcessing}
                        title="View/Download PDF"
                      >
                        {isProcessing ? <Download className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/reports/${report.id}/edit`)} title="Edit Report">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(report.id)} title='Delete Report'>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No reports have been created for this patient.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}