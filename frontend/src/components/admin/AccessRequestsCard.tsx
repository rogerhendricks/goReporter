import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/utils/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type AccessRequestScope = 'temporary' | 'permanent'

type AccessRequestResponse = {
  id: number
  patientId: number
  requesterUserId: number
  scope: AccessRequestScope
  expiresAt?: string | null
  status: string
  reason?: string
  createdAt: string
  patient: {
    id: number
    mrn: number
    fname: string
    lname: string
    dob?: string
  }
  requesterUser: {
    id: number
    username: string
    fullName?: string
    role: string
  }
}

function formatDateTime(input?: string | null) {
  if (!input) return '—'
  const dt = new Date(input)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString()
}

export function AccessRequestsCard() {
  const [scope, setScope] = useState<AccessRequestScope>('temporary')
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<AccessRequestResponse[]>([])
  const [error, setError] = useState<string>('')

  // Always reset to temporary view on load/mount
  useEffect(() => {
    setScope('temporary')
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get<AccessRequestResponse[]>('/admin/access-requests', {
          params: { scope, status: 'pending' }
        })
        if (!mounted) return
        setItems(res.data ?? [])
      } catch (e: any) {
        if (!mounted) return
        setError(e?.response?.data?.error || 'Failed to load access requests')
        setItems([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [scope])

  const counts = useMemo(() => {
    return {
      pending: items.length
    }
  }, [items])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Patient Access Requests</CardTitle>
          <div className="text-sm text-muted-foreground mt-1">
            Pending: <span className="font-medium">{counts.pending}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={scope === 'temporary' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setScope('temporary')}
          >
            Temporary
          </Button>
          <Button
            variant={scope === 'permanent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setScope('permanent')}
          >
            Permanent
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending requests.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">
                      {r.patient.lname}, {r.patient.fname}
                    </div>
                    <div className="text-xs text-muted-foreground">MRN {r.patient.mrn}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.requesterUser.fullName || r.requesterUser.username}</div>
                    <div className="text-xs text-muted-foreground">@{r.requesterUser.username}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.scope === 'temporary' ? 'secondary' : 'default'}>
                      {r.scope}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDateTime(r.expiresAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/access-requests/${r.id}`}>Review</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
