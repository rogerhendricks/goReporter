import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePatientStore } from '@/stores/patientStore'
import { tagService, type Tag } from '@/services/tagService'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, FileDown, Plus, Check, X } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  tags: number[]
}

export default function PatientSearch() {
  const { searchResults, loading, error, searchPatientsComplex, clearError } = usePatientStore()
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [openTagSearch, setOpenTagSearch] = useState(false)
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
    tags: [],
  })

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      const tags = await tagService.getAll()
      setAvailableTags(tags)
    } catch (error) {
      console.error("Failed to load tags:", error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleToggleTag = (tagId: number) => {
    setFilters(prev => {
      const newTags = prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId]
      return { ...prev, tags: newTags }
    })
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    // Create a clean object with only non-empty filters
    const activeFilters: any = Object.fromEntries(
      Object.entries(filters).filter(([key, value]) => {
        if (key === 'tags') return (value as number[]).length > 0
        return (value as string).trim() !== ''
      })
    )
    await searchPatientsComplex(activeFilters)
  }

  const handleReset = () => {
    setFilters({
      firstName: '', lastName: '', mrn: '', dob: '', doctorName: '',
      deviceSerial: '', deviceManufacturer: '', deviceName: '', deviceModel: '',
      leadManufacturer: '', leadName: '', tags: []
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
      'Assigned Doctors': patient.patientDoctors?.map(pd => pd.doctor.fullName).join(', ') || 'N/A',
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

    const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Patients', current: true },
    { label: '+ Add Patient', href: '/patients/new' }
  ]
  
  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />

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

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Filter by Tags</span>
                <Popover open={openTagSearch} onOpenChange={setOpenTagSearch}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 border-dashed">
                      <Plus className="mr-2 h-4 w-4" />
                      Select Tags
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search tags..." />
                      <CommandList>
                        <CommandEmpty>No tags found.</CommandEmpty>
                        <CommandGroup>
                          {availableTags.map((tag) => {
                            const isSelected = filters.tags.includes(tag.ID)
                            return (
                              <CommandItem
                                key={tag.ID}
                                onSelect={() => handleToggleTag(tag.ID)}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span>{tag.name}</span>
                                  {isSelected && <Check className="ml-auto h-4 w-4" />}
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 border rounded-md bg-background">
                {filters.tags.length > 0 ? (
                  filters.tags.map((tagId) => {
                    const tag = availableTags.find(t => t.ID === tagId)
                    if (!tag) return null
                    return (
                      <Badge
                        key={tag.ID}
                        variant="outline"
                        className="flex items-center gap-1 pr-1"
                        style={{ 
                          borderColor: tag.color, 
                          color: tag.color,
                          backgroundColor: `${tag.color}10`
                        }}
                      >
                        {tag.name}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent text-current"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleTag(tag.ID)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )
                  })
                ) : (
                  <span className="text-sm text-muted-foreground italic self-center">No tags selected</span>
                )}
              </div>
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
                          {pd.doctor.fullName}
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