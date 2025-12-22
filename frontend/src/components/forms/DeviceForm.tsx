import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDeviceStore } from '@/stores/deviceStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { useFormShortcuts } from '@/hooks/useFormShortcuts'
import { toast } from 'sonner'

interface DeviceFormData {
  name: string
  manufacturer: string
  model: string
  type: string
  polarity?: string
  isMri: boolean
}

export default function DeviceForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = id !== undefined
  
  const { currentDevice, loading, error, fetchDevice, createDevice, updateDevice, clearError } = useDeviceStore()
  
  const [formData, setFormData] = useState<DeviceFormData>({
    name: '',
    manufacturer: '',
    model: '',
    type: '',
    polarity: '',
    isMri: false
  })

  useEffect(() => {
    if (isEdit && id) {
      fetchDevice(parseInt(id))
    }
  }, [isEdit, id, fetchDevice])

  useEffect(() => {
    if (isEdit && currentDevice) {
      setFormData({
        name: currentDevice.name,
        manufacturer: currentDevice.manufacturer,
        model: currentDevice.model,
        type: currentDevice.type,
        polarity: currentDevice.polarity,
        isMri: currentDevice.isMri
      })
    }
  }, [currentDevice, isEdit])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      // Ensure polarity is set to empty string if undefined for required field
      const submitData = {
        ...formData,
        polarity: formData.polarity || ''
      }
      
      if (isEdit && id) {
        await updateDevice(parseInt(id), submitData)
        toast.success('Device updated successfully')
      } else {
        await createDevice(submitData)
        toast.success('Device created successfully')
      }
      navigate('/devices')
    } catch (err) {
      toast.error('Failed to save device')
      console.error('Error saving device:', err)
      // error is handled in the store
    }
  }

  useFormShortcuts(handleSubmit);
  
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Devices', href: '/devices' },
    { label: isEdit ? `Edit ${currentDevice?.name || 'Device'}` : 'New Device', current: true }
  ]

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Device' : 'Create New Device'}</h1>
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
              <div><Label htmlFor="name">Device Name</Label><Input id="name" name="name" value={formData.name} onChange={handleInputChange} required /></div>
              <div><Label htmlFor="model">Model</Label><Input id="model" name="model" value={formData.model} onChange={handleInputChange} required /></div>
              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                {/* <Input id="manufacturer" name="manufacturer" value={formData.manufacturer} onChange={handleInputChange} required /> */}
                <Select name="manufacturer" value={formData.manufacturer || ''} onValueChange={(value) => handleSelectChange('manufacturer', value)} required>
                <SelectTrigger><SelectValue placeholder="Select manufacturer..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Abbott">Abbott</SelectItem>
                  <SelectItem value="Biotronik">Biotronik</SelectItem>
                  <SelectItem value="Boston Scientific">Boston Sceintific</SelectItem>
                  <SelectItem value="Medtronic">Medtronic</SelectItem>
                  <SelectItem value="Microport">Microport</SelectItem>
                </SelectContent>
              </Select>
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select name="type" value={formData.type || ''} onValueChange={(value) => handleSelectChange('type', value)} required>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pacemaker">Pacemaker</SelectItem>
                  <SelectItem value="Defibrillator">Defibrillator</SelectItem>
                  <SelectItem value="ILR">Loop Recorder</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="isMri" name="isMri" checked={formData.isMri} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isMri: !!checked }))} />
              <Label htmlFor="isMri">MRI Safe</Label>
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (isEdit ? 'Update Device' : 'Create Device')}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/devices')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}