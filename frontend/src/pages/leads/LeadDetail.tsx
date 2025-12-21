import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLeadStore } from '@/stores/leadStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Edit, Trash2, ArrowLeft } from 'lucide-react'
import { DetailPageSkeleton } from '@/components/ui/loading-skeletons'

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentLead, loading, fetchLead, deleteLead } = useLeadStore()

  useEffect(() => {
    if (id) {
      fetchLead(parseInt(id))
    }
  }, [id, fetchLead])

  const handleDelete = async () => {
    if (currentLead && window.confirm(`Are you sure you want to delete ${currentLead.name}?`)) {
      await deleteLead(currentLead.ID)
      navigate('/leads')
    }
  }

  if (loading) {
    return <DetailPageSkeleton />
  }

  if (!currentLead) {
    return <div className="container mx-auto py-6 text-center">Lead not found.</div>
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Leads', href: '/leads' },
    { label: currentLead.name, current: true }
  ]

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/leads')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{currentLead.name}</h1>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => navigate(`/leads/${currentLead.ID}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Lead Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Model:</strong> {currentLead.model}</div>
          <div><strong>Manufacturer:</strong> {currentLead.manufacturer}</div>
          <div><strong>Connector:</strong> {currentLead.connector}</div>
          <div>
            <strong>MRI Safe:</strong>
            <Badge variant={currentLead.isMri ? 'default' : 'secondary'} className="ml-2">
              {currentLead.isMri ? 'Yes' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}