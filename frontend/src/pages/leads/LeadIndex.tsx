import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLeadStore } from '@/stores/leadStore'
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

export default function LeadIndex() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const { 
    leads, 
    loading, 
    error, 
    fetchLeads, 
    deleteLead, 
    searchLeads,
    clearError 
  } = useLeadStore()

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      await searchLeads(searchQuery)
    } else {
      await fetchLeads()
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete lead ${name}?`)) {
      await deleteLead(id)
    }
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Leads', current: true }
  ]

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav items={breadcrumbItems} />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Leads</h1>
        <Button onClick={() => navigate('/leads/new')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Lead
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
        <CardHeader><CardTitle>Search Leads</CardTitle></CardHeader>
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
        <CardHeader><CardTitle>All Leads ({leads.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No leads found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Name</TableHead>
                  <TableHead className="text-left">Model</TableHead>
                  <TableHead className="text-left">Manufacturer</TableHead>
                  <TableHead className="text-left">Connector</TableHead>
                  <TableHead className="text-left">MRI Safe</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-left">
                      <Link to={`/leads/${lead.id}`} className="hover:underline font-medium">
                        {lead.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-left">{lead.model}</TableCell>
                    <TableCell className="text-left">{lead.manufacturer}</TableCell>
                    <TableCell className="text-left">{lead.connector}</TableCell>
                    <TableCell className="text-left"> 
                      <Badge variant={lead.isMri ? 'default' : 'secondary'}>
                        {lead.isMri ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/leads/${lead.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(lead.id, lead.name)}>
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