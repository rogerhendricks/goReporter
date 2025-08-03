import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { usePatientStore } from '@/stores/patientStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Edit, Trash2, ArrowLeft, Phone, Mail, MapPin, Plus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QRSDurationChart } from '@/components/charts/QRSDurationChart'
// import { QRSDurationTable } from '@/components/tables/QRSDurationTable'

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentPatient, loading, fetchPatient, deletePatient } = usePatientStore()

  useEffect(() => {
    if (id) {
      fetchPatient(parseInt(id))
    }
  }, [id])

  const handleDelete = async () => {
    if (currentPatient && window.confirm(`Are you sure you want to delete ${currentPatient.fname} ${currentPatient.lname}?`)) {
      await deletePatient(currentPatient.id)
      navigate('/patients')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getLastReportDate = () => {
    if (!currentPatient?.report || currentPatient.report.length === 0) {
      return null
    }
    
    // Sort reports by date and get the most recent one
    const sortedReports = currentPatient.report.sort((a, b) => 
      new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
    )
    
    return sortedReports[0].reportDate
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Patients', href: '/patients' },
    { label: currentPatient ? `${currentPatient.fname} ${currentPatient.lname}` : 'Loading...', current: true }
  ]

  if (loading) {
    return (
      <div className="container mx-auto py-6">
      <BreadcrumbNav items={[
        { label: 'Home', href: '/' },
        { label: 'Patients', href: '/patients' },
        { label: 'Loading...', current: true }
      ]} />
      <div className="text-center py-8">Loading...</div>
    </div>
    )
  }

  if (!currentPatient) {
    return (
      <div className="container mx-auto py-6">
      <BreadcrumbNav items={[
        { label: 'Home', href: '/' },
        { label: 'Patients', href: '/patients' },
        { label: 'Not Found', current: true }
      ]} />
      <div className="text-center py-8">Patient not found</div>
    </div>
    )
  }

  // const lastReportDate = getLastReportDate()

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/patients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {currentPatient.fname} {currentPatient.lname}
        </h1>
        <div className="ml-auto flex gap-2">
          <Button asChild>
            <Link to={`/patients/${currentPatient.id}/reports/new`}>
              <Plus className="mr-2 h-4 w-4" /> Create New Report
            </Link>
          </Button>
          <Button asChild variant="secondary" >
            <Link to={`/patients/${currentPatient.id}/reports`} className="flex items-center gap-2">
              View All
              <Badge variant="outline" className="bg-background">
                {currentPatient.reportCount || 0}
              </Badge>
            </Link>
          </Button>
          <Button onClick={() => navigate(`/patients/${currentPatient.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong>MRN:</strong> {currentPatient.mrn}
            </div>
            <div>
              <strong>Date of Birth:</strong> {formatDate(currentPatient.dob)}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{currentPatient.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{currentPatient.email}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1" />
              <div className='text-left leading-tight'>
                {currentPatient.street}<br />
                {currentPatient.city}, {currentPatient.state}<br />
                {currentPatient.country} {currentPatient.postal}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assigned Doctors ({currentPatient.patientDoctors?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {currentPatient.patientDoctors && currentPatient.patientDoctors.length > 0 ? (
              <div className="relative">
                <div className="max-h-[240px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-muted/10">
                  {currentPatient.patientDoctors.map((patientDoctor) => (
                    <div key={patientDoctor.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="font-semibold">{patientDoctor.doctor.name}</div>
                        {patientDoctor.isPrimary && (
                          <Badge variant="default">Primary</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{patientDoctor.doctor.email}</div>
                      <div className="text-sm text-muted-foreground">{patientDoctor.doctor.phone1}</div>
                      {patientDoctor.address && (
                        <div className="text-xs text-muted-foreground">
                          {patientDoctor.address.street}, {patientDoctor.address.city}, {patientDoctor.address.state} {patientDoctor.address.zip}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {currentPatient.patientDoctors.length > 3 && (
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No doctors assigned</p>
            )}
          </CardContent>
        </Card>

        {currentPatient.devices && currentPatient.devices.length > 0 && (
          <Card className ="md:col-span-2">
            <CardHeader>
              <CardTitle>Implanted Devices ({currentPatient.devices?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Device</TableHead>
                    <TableHead className="text-left">Serial</TableHead>
                    <TableHead className="text-left">Implanted On</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPatient.devices.map((implanted) => (
                    <TableRow key={implanted.id}>
                      <TableCell className="text-left">
                        <div className="font-medium">{implanted.device.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {implanted.device.manufacturer} {implanted.device.model}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">{implanted.serial}</TableCell>
                      <TableCell className="text-left">{formatDate(implanted.implantedAt)}</TableCell>
                      <TableCell className="text-left">
                        <Badge variant={implanted.explantedAt ? "destructive" : "default"}>
                          {implanted.explantedAt ? "Explanted" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Implanted Leads ({currentPatient.leads?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {currentPatient.leads && currentPatient.leads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Lead</TableHead>
                    <TableHead className="text-left">Serial</TableHead>
                    <TableHead className="text-left">Chamber</TableHead>
                    <TableHead className="text-left">Implanted On</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPatient.leads.map((implanted) => (
                    <TableRow key={implanted.id}>
                      <TableCell className="text-left">
                        <div className="font-medium">{implanted.lead.name}</div>
                        <div className="text-sm text-muted-foreground">{implanted.lead.manufacturer} {implanted.lead.model}</div>
                      </TableCell>
                      <TableCell className="text-left">{implanted.serial}</TableCell>
                      <TableCell className="text-left">{implanted.chamber}</TableCell>
                      <TableCell className="text-left">{formatDate(implanted.implantedAt)}</TableCell>
                      <TableCell className="text-left">{implanted.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No leads implanted</p>
            )}
          </CardContent>
        </Card>



        {currentPatient.medications && currentPatient.medications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Medications ({currentPatient.medications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentPatient.medications.map((medication, index) => (
                  <Badge key={index} variant="outline">
                    {medication.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* QRS Duration Chart */}
        <div className="md:col-span-2">
          <QRSDurationChart reports={currentPatient.report || []} />
        </div>

        {/* QRS Duration Table */}
        {/* <div className="md:col-span-2">
          <QRSDurationTable reports={currentPatient.report || []} />
        </div> */}
        
      </div>
    </div>
  )
}