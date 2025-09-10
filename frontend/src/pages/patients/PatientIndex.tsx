import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePatientStore } from '@/stores/patientStore'
import { useAuthStore } from '@/stores/authStore'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Edit, Plus, Search, User } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from "@/components/ui/badge"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"


export default function PatientIndex() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const { isAdmin } = useAuthStore()
  const { 
    patients, 
    loading, 
    error, 
    fetchPatients, 
    deletePatient, 
    searchPatients,
    clearError 
  } = usePatientStore()

  useEffect(() => {
    fetchPatients()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      await searchPatients(searchQuery)
    } else {
      await fetchPatients()
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete patient ${name}?`)) {
      await deletePatient(id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

    const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Patients', current: true }
  ]
  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Patients</h1>
        {isAdmin && (
          <Button onClick={() => navigate('/patients/new')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Patient
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" onClick={clearError} className="mt-2">
            Dismiss
          </Button>
        </Alert>
      )}
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search by name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Patients ({patients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : patients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No patients found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">MRN</TableHead>
                  <TableHead className="text-left">Name</TableHead>
                  <TableHead className="text-left">Date of Birth</TableHead>
                  <TableHead className="text-left">Phone</TableHead>
                  <TableHead className="text-left">Device</TableHead>
                  <TableHead className="text-left">Doctors</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium text-left">{patient.mrn}</TableCell>
                    <TableCell className="text-left">
                      <Link 
                        to={`/patients/${patient.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <User className="h-4 w-4" />
                        {patient.fname} {patient.lname}
                      </Link>
                    </TableCell>
                    <TableCell className="text-left">{formatDate(patient.dob)}</TableCell>
                    <TableCell className="text-left">{patient.phone}</TableCell>
                    <TableCell className="text-left">
                    {((patient.devices && patient.devices.length > 0) || (patient.leads && patient.leads.length > 0)) ? (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700">
                            {(patient.devices?.length || 0) + (patient.leads?.length || 0)} item(s)
                          </Badge>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="flex flex-col space-y-2">
                            {/* Devices Section */}
                            {patient.devices && patient.devices.length > 0 && (
                              <div>
                                <h4 className="mb-1 text-sm font-bold text-gray-500 dark:text-gray-400">Devices</h4>
                                <div className="flex flex-col space-y-2">
                                  {patient.devices.map((device) => (
                                    <div key={device.id}>
                                      <p className="text-sm font-semibold">{`${device.device.manufacturer} ${device.device.model}`}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Name: {device.device.name} {device.status ? `(${device.status})` : ''}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Separator */}
                            {patient.devices && patient.devices.length > 0 && patient.leads && patient.leads.length > 0 && (
                              <hr className="my-2" />
                            )}

                            {/* Leads Section */}
                            {patient.leads && patient.leads.length > 0 && (
                              <div>
                                <h4 className="mb-1 text-sm font-bold text-gray-500 dark:text-gray-400">Leads</h4>
                                <div className="flex flex-col space-y-2">
                                  {patient.leads.map((lead) => (
                                    <div key={lead.id}>
                                      <p className="text-sm font-semibold">{`${lead.lead.manufacturer} ${lead.lead.name}`}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Model: {lead.lead.leadModel} {lead.status ? `(${lead.status})` : ''}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      <span className="text-xs text-muted-foreground">No devices or leads</span>
                    )}
                    </TableCell>
                    <TableCell className="text-left">
                    {patient.patientDoctors && patient.patientDoctors.length > 0 ? (
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700">
                              {patient.patientDoctors.length} doctor(s)
                            </Badge>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80">
                            <div className="flex flex-col space-y-4">
                              {patient.patientDoctors.map((pd, index) => (
                                <div key={pd.id}>
                                  <div>
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
                                      {pd.doctor.name}
                                      {pd.isPrimary && <Badge variant="outline">Primary</Badge>}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                    {pd.address
                                        ? `${pd.address.street}, ${pd.address.city}, ${pd.address.state} ${pd.address.zip}`
                                        : 'No specific address assigned'
                                      }
                                    </p>
                                  </div>
                                  {index < patient.patientDoctors.length - 1 && (
                                    <hr className="mt-2" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <span className="text-xs text-muted-foreground">No doctors assigned</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/patients/${patient.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(patient.id, `${patient.fname} ${patient.lname}`)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
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