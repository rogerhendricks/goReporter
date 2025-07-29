import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDoctorStore } from '@/stores/doctorStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface Address {
  street: string
  city: string
  state: string
  country: string
  zip: string
}

interface DoctorFormData {
  name: string
  email: string
  phone: string
  addresses: Address[]
}

export default function DoctorForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = id !== undefined
  
  const { currentDoctor, loading, error, fetchDoctor, createDoctor, updateDoctor, clearError } = useDoctorStore()
  
  const [formData, setFormData] = useState<DoctorFormData>({
    name: '',
    email: '',
    phone: '',
    addresses: [{ street: '', city: '', state: '', country: '', zip: '' }]
  })

  useEffect(() => {
    if (isEdit && id) {
      fetchDoctor(parseInt(id))
    }
  }, [isEdit, id, fetchDoctor])

  useEffect(() => {
    if (isEdit && currentDoctor) {
      setFormData({
        name: currentDoctor.name,
        email: currentDoctor.email,
        phone: currentDoctor.phone,
        addresses: currentDoctor.addresses.length > 0 ? currentDoctor.addresses : [{ street: '', city: '', state: '', country: '', zip: '' }]
      })
    }
  }, [currentDoctor, isEdit])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddressChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const addresses = [...formData.addresses]
    addresses[index] = { ...addresses[index], [name]: value }
    setFormData(prev => ({ ...prev, addresses }))
  }

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, { street: '', city: '', state: '', country: '', zip: '' }]
    }))
  }

  const removeAddress = (index: number) => {
    const addresses = [...formData.addresses]
    addresses.splice(index, 1)
    setFormData(prev => ({ ...prev, addresses }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      if (isEdit && id) {
        await updateDoctor(parseInt(id), formData)
        toast.success('Doctor updated successfully')
      } else {
        await createDoctor(formData)
        toast.success('Doctor created successfully')
      }
      navigate('/doctors')
    } catch (err) {
      toast.error('An error occurred while saving the doctor')
      console.error(err)
      // error is handled in the store
    }
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Doctors', href: '/doctors' },
    { label: isEdit ? `Edit ${currentDoctor?.name || 'Doctor'}` : 'New Doctor', current: true }
  ]

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/doctors')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Doctor' : 'Create New Doctor'}</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="name">Full Name</Label><Input id="name" name="name" value={formData.name} onChange={handleInputChange} required /></div>
              <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required /></div>
              <div><Label htmlFor="phone">Primary Phone</Label><Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required /></div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Addresses</h3>
              {formData.addresses.map((address, index) => (
                <div key={index} className="p-4 border rounded-md space-y-4 relative">
                  {formData.addresses.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeAddress(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <div><Label htmlFor={`street-${index}`}>Street</Label><Input id={`street-${index}`} name="street" value={address.street} onChange={e => handleAddressChange(index, e)} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label htmlFor={`city-${index}`}>City</Label><Input id={`city-${index}`} name="city" value={address.city} onChange={e => handleAddressChange(index, e)} /></div>
                    <div><Label htmlFor={`state-${index}`}>State</Label><Input id={`state-${index}`} name="state" value={address.state} onChange={e => handleAddressChange(index, e)} /></div>
                    <div><Label htmlFor={`zip-${index}`}>Zip/Postal Code</Label><Input id={`zip-${index}`} name="zip" value={address.zip} onChange={e => handleAddressChange(index, e)} /></div>
                  </div>
                  <div><Label htmlFor={`country-${index}`}>Country</Label><Input id={`country-${index}`} name="country" value={address.country} onChange={e => handleAddressChange(index, e)} /></div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addAddress}><Plus className="h-4 w-4 mr-2" />Add Address</Button>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (isEdit ? 'Update Doctor' : 'Create Doctor')}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/doctors')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}