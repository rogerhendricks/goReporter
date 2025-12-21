import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDeviceStore } from '@/stores/deviceStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Edit, Trash2, ArrowLeft } from 'lucide-react'
import { DetailPageSkeleton } from '@/components/ui/loading-skeletons'

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentDevice, loading, fetchDevice, deleteDevice } = useDeviceStore()

  useEffect(() => {
    if (id) {
      console.log('DeviceDetail: ID from params:', id)
      console.log('DeviceDetail: ID type:', typeof id)
      
      const numericId = parseInt(id, 10)
      if (isNaN(numericId)) {
        console.error('DeviceDetail: Invalid ID format:', id)
        return
      }
      
      console.log('DeviceDetail: Fetching device with numeric ID:', numericId)
      
      fetchDevice(parseInt(id))
    }
  }, [id, fetchDevice])

  const handleDelete = async () => {
    if (currentDevice && window.confirm(`Are you sure you want to delete ${currentDevice.name}?`)) {
      await deleteDevice(currentDevice.ID)
      navigate('/devices')
    }
  }

  if (loading) {
    return <DetailPageSkeleton />
  }

  if (!currentDevice) {
    return <div className="container mx-auto py-6 text-center">Device not found.</div>
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Devices', href: '/devices' },
    { label: currentDevice.name, current: true }
  ]

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/devices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{currentDevice.name}</h1>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => navigate(`/devices/${currentDevice.ID}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Device Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Model:</strong> {currentDevice.model}</div>
          <div><strong>Manufacturer:</strong> {currentDevice.manufacturer}</div>
          <div><strong>Type:</strong> {currentDevice.type}</div>
          <div>
            <strong>MRI Safe:</strong>
            <Badge variant={currentDevice.isMri ? 'default' : 'secondary'} className="ml-2">
              {currentDevice.isMri ? 'Yes' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}