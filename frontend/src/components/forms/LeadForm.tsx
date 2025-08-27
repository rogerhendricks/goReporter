import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLeadStore } from '@/stores/leadStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

interface LeadFormData {
  name: string
  manufacturer: string
  model: string
  type: string
  isMri: boolean
}

export default function LeadForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = id !== undefined
  
  const { currentLead, loading, error, fetchLead, createLead, updateLead, clearError } = useLeadStore()
  
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    manufacturer: '',
    model: '',
    type: '',
    isMri: false
  })

  useEffect(() => {
    if (isEdit && id) {
      fetchLead(parseInt(id))
    }
  }, [isEdit, id, fetchLead])

  useEffect(() => {
    if (isEdit && currentLead) {
      setFormData({
        name: currentLead.name,
        manufacturer: currentLead.manufacturer,
        model: currentLead.model,
        type: currentLead.type,
        isMri: currentLead.isMri
      })
    }
  }, [currentLead, isEdit])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      if (isEdit && id) {
        await updateLead(parseInt(id), formData)
        toast.success('Lead updated successfully')
      } else {
        await createLead(formData)
        toast.success('Lead created successfully')
      }
      navigate('/leads')
    } catch (err) {
      console.error('Error saving lead:', err)
      toast.error('Failed to save lead')
      // error is handled in the store
    }
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Leads', href: '/leads' },
    { label: isEdit ? `Edit ${currentLead?.name || 'Lead'}` : 'New Lead', current: true }
  ]

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      <div className="flex items-center gap-4 mb-6">

        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Lead' : 'Create New Lead'}</h1>
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
              <div><Label htmlFor="name">Lead Name</Label><Input id="name" name="name" value={formData.name} onChange={handleInputChange} required /></div>
              <div><Label htmlFor="model">Model</Label><Input id="model" name="model" value={formData.model} onChange={handleInputChange} required /></div>
              <div><Label htmlFor="manufacturer">Manufacturer</Label><Input id="manufacturer" name="manufacturer" value={formData.manufacturer} onChange={handleInputChange} required /></div>
              <div><Label htmlFor="type">Type</Label><Input id="type" name="type" value={formData.type} onChange={handleInputChange} required /></div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="isMri" name="isMri" checked={formData.isMri} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isMri: !!checked }))} />
              <Label htmlFor="isMri">MRI Safe</Label>
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (isEdit ? 'Update Lead' : 'Create Lead')}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/leads')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}