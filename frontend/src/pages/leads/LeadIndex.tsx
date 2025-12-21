import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLeadStore } from '@/stores/leadStore'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Trash2, Edit, Search } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/loading-skeletons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

export default function LeadIndex() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 25

  const { 
    leads,
    pagination, 
    loading, 
    error, 
    fetchLeads, 
    deleteLead, 
    // searchLeads,
    clearError 
  } = useLeadStore()

  useEffect(() => {
    fetchLeads(currentPage, ITEMS_PER_PAGE, searchQuery)
  }, [currentPage, fetchLeads, searchQuery])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    await fetchLeads(1, ITEMS_PER_PAGE, searchQuery)
  }

    const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete lead ${name}?`)) {
      await deleteLead(id)
      // Refresh current page after deletion
      await fetchLeads(currentPage, ITEMS_PER_PAGE, searchQuery)
    }
  }

  const renderPaginationItems = () => {
    if (!pagination) return null

    const items = []
    const totalPages = pagination.totalPages
    const current = currentPage

    // Always show first page
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          onClick={() => handlePageChange(1)}
          isActive={current === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    )

    // Show ellipsis if needed
    if (current > 3) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      )
    }

    // Show pages around current page
    for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            isActive={current === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }

    // Show ellipsis if needed
    if (current < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      )
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => handlePageChange(totalPages)}
            isActive={current === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }

    return items
  }


  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Leads', current: true },
    { label: '+ Add Lead', href: '/leads/new' }
  ]

  return (
    <div className="container mx-auto">
      <BreadcrumbNav items={breadcrumbItems} />
      
      {/* <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Leads</h1>
        <Button onClick={() => navigate('/leads/new')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </div> */}

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
            <TableSkeleton rows={10} columns={5} />
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No leads found.</div>
          ) : (
            <>
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
                  <TableRow key={lead.ID}>
                    <TableCell className="text-left">
                      <Link to={`/leads/${lead.ID}`} className="hover:underline font-medium">
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
                        <Button variant="outline" size="sm" onClick={() => navigate(`/leads/${lead.ID}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(lead.ID, lead.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} devices
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(currentPage - 1)}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {renderPaginationItems()}
                        
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => handlePageChange(currentPage + 1)}
                            className={currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}