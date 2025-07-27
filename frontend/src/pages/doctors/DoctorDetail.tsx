import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDoctorStore } from '@/stores/doctorStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Edit, Trash2, ArrowLeft, Phone, Mail, MapPin } from 'lucide-react'

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentDoctor, loading, fetchDoctor, deleteDoctor } = useDoctorStore()

  useEffect(() => {
    if (id) {
      fetchDoctor(parseInt(id))
    }
  }, [id, fetchDoctor])

  const handleDelete = async () => {
    if (currentDoctor && window.confirm(`Are you sure you want to delete Dr. ${currentDoctor.name}?`)) {
      await deleteDoctor(currentDoctor.id)
      navigate('/doctors')
    }
  }

  if (loading) {
    return <div className="container mx-auto py-6 text-center">Loading...</div>
  }

  if (!currentDoctor) {
    return <div className="container mx-auto py-6 text-center">Doctor not found.</div>
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Doctors', href: '/doctors' },
    { label: currentDoctor.name, current: true }
  ]

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/doctors')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{currentDoctor.name}</h1>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => navigate(`/doctors/${currentDoctor.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><span>{currentDoctor.email}</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4" /><span>{currentDoctor.phone1} (Primary)</span></div>
              {currentDoctor.phone2 && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /><span>{currentDoctor.phone2} (Secondary)</span></div>}
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader><CardTitle>Addresses</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {currentDoctor.addresses?.length > 0 ? (
                currentDoctor.addresses.map((address, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 border rounded">
                    <MapPin className="h-4 w-4 mt-1" />
                    <div>
                      {address.street}<br />
                      {address.city}, {address.state} {address.zip}<br />
                      {address.country}
                    </div>
                  </div>
                ))
              ) : (
                <p>No addresses on file.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}