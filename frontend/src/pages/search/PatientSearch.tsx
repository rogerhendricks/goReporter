import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePatientStore } from '@/stores/patientStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

// Define an interface for the search form fields
interface SearchFilters {
  firstName: string
  lastName: string
  mrn: string
  dob: string
  doctorName: string
  deviceSerial: string
  deviceManufacturer: string
  deviceName: string
  deviceModel: string
  leadManufacturer: string
  leadName: string
}

export default function PatientSearch() {
  const { searchResults, loading, error, searchPatientsComplex, clearError } = usePatientStore()
  const [filters, setFilters] = useState<SearchFilters>({
    firstName: '',
    lastName: '',
    mrn: '',
    dob: '',
    doctorName: '',
    deviceSerial: '',
    deviceManufacturer: '',
    deviceName: '',
    deviceModel: '',
    leadManufacturer: '',
    leadName: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    // Create a clean object with only non-empty filters
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value.trim() !== '')
    )
    await searchPatientsComplex(activeFilters)
  }

  const handleReset = () => {
    setFilters({
      firstName: '', lastName: '', mrn: '', dob: '', doctorName: '',
      deviceSerial: '', deviceManufacturer: '', deviceName: '', deviceModel: '',
      leadManufacturer: '', leadName: ''
    })
    // Optionally clear results when resetting
    // usePatientStore.setState({ searchResults: [] }) 
  }

  const handleExport = () => {
    if (searchResults.length === 0) {
      toast.info("There are no results to export.");
      return;
    }

    // Format the data for the worksheet
    const dataToExport = searchResults.map(patient => ({
      'First Name': patient.fname,
      'Last Name': patient.lname,
      'MRN': patient.mrn,
      'DOB': new Date(patient.dob).toLocaleDateString(),
      'Street': patient.street,
      'Assigned Doctors': patient.patientDoctors?.map(pd => pd.doctor.name).join(', ') || 'N/A',
    }));

    // Create a new worksheet from the formatted data
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PatientSearchResults');

    // Trigger the file download
    XLSX.writeFile(workbook, 'patient_search_results.xlsx');
    toast.success("Data exported successfully!");
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Advanced Patient Search</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={searchResults.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Patient Fields */}
              <Input name="firstName" placeholder="First Name" value={filters.firstName} onChange={handleInputChange} />
              <Input name="lastName" placeholder="Last Name" value={filters.lastName} onChange={handleInputChange} />
              <Input name="mrn" placeholder="MRN" value={filters.mrn} onChange={handleInputChange} />
              <Input name="dob" placeholder="DOB (YYYY-MM-DD)" value={filters.dob} onChange={handleInputChange} type="date" />
              {/* Doctor Field */}
              <Input name="doctorName" placeholder="Doctor Name" value={filters.doctorName} onChange={handleInputChange} />
              {/* Device Fields */}
              <Input name="deviceSerial" placeholder="Device Serial" value={filters.deviceSerial} onChange={handleInputChange} />
              <Input name="deviceManufacturer" placeholder="Device Manufacturer" value={filters.deviceManufacturer} onChange={handleInputChange} />
              <Input name="deviceName" placeholder="Device Name" value={filters.deviceName} onChange={handleInputChange} />
              <Input name="deviceModel" placeholder="Device Model" value={filters.deviceModel} onChange={handleInputChange} />
              {/* Lead Fields */}
              <Input name="leadManufacturer" placeholder="Lead Manufacturer" value={filters.leadManufacturer} onChange={handleInputChange} />
              <Input name="leadName" placeholder="Lead Name" value={filters.leadName} onChange={handleInputChange} />
            </div>
            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" onClick={clearError} className="mt-2">Dismiss</Button>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Search Results ({searchResults.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No patients found. Use the filters above to start a search.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Street</TableHead>
                  <TableHead>Assigned Doctors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <Link to={`/patients/${patient.id}`} className="flex items-center gap-2 hover:underline">
                        <User className="h-4 w-4" />
                        {patient.fname} {patient.lname}
                      </Link>
                    </TableCell>
                    <TableCell>{patient.street}</TableCell>
                    <TableCell>
                      {patient.patientDoctors?.map(pd => (
                        <Badge key={pd.id} variant="secondary" className="mr-1">
                          {pd.doctor.name}
                        </Badge>
                      ))}
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