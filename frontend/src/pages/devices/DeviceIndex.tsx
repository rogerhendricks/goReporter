import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDeviceStore } from '@/stores/deviceStore'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Trash2, Edit, Plus, Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function DeviceIndex() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const { 
    devices, 
    loading, 
    error, 
    fetchDevices, 
    deleteDevice, 
    searchDevices,
    clearError 
  } = useDeviceStore()

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      await searchDevices(searchQuery)
    } else {
      await fetchDevices()
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete device ${name}?`)) {
      await deleteDevice(id)
    }
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Devices', current: true }
  ]

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Devices</h1>
        <Button onClick={() => navigate('/devices/new')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Device
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
        <CardHeader><CardTitle>Search Devices</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search by name or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline"><Search className="h-4 w-4" /></Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Devices ({devices.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No devices found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>MRI Safe</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <Link to={`/devices/${device.id}`} className="hover:underline font-medium">
                        {device.name}
                      </Link>
                    </TableCell>
                    <TableCell>{device.model}</TableCell>
                    <TableCell>{device.manufacturer}</TableCell>
                    <TableCell>{device.type}</TableCell>
                    <TableCell>
                      <Badge variant={device.isMri ? 'default' : 'secondary'}>
                        {device.isMri ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/devices/${device.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(device.id, device.name)}>
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