import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDoctorStore } from '@/stores/doctorStore'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Edit, Plus, Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function DoctorIndex() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const { 
    doctors, 
    loading, 
    error, 
    fetchDoctors, 
    deleteDoctor, 
    searchDoctors,
    clearError 
  } = useDoctorStore()

  useEffect(() => {
    fetchDoctors()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      await searchDoctors(searchQuery)
    } else {
      await fetchDoctors()
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete doctor ${name}?`)) {
      await deleteDoctor(id)
    }
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Doctors', current: true }
  ]

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Doctors</h1>
        <Button onClick={() => navigate('/doctors/new')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Doctor
        </Button>
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
          <CardTitle>Search Doctors</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search by name or email..."
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
          <CardTitle>All Doctors ({doctors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No doctors found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Name</TableHead>
                  <TableHead className="text-left">Email</TableHead>
                  <TableHead className="text-left">Phone</TableHead>
                  <TableHead className="text-left">Specialty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="text-left">
                      <Link to={`/doctors/${doctor.id}`} className="hover:underline">
                        {doctor.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-left">{doctor.email}</TableCell>
                    <TableCell className="text-left">{doctor.phone}</TableCell>
                    <TableCell className="text-left">{doctor.specialty}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/doctors/${doctor.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(doctor.id, doctor.fullName)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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