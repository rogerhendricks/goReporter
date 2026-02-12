import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '@/utils/axios'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type AccessRequestScope = 'temporary' | 'permanent'

type AccessRequestResponse = {
  id: number
  patientId: number
  requesterUserId: number
  scope: AccessRequestScope
  expiresAt?: string | null
  status: 'pending' | 'approved' | 'denied' | string
  reason?: string
  resolutionNote?: string
  createdAt: string
  resolvedAt?: string | null
  patient: {
    id: number
    mrn: number
    fname: string
    lname: string
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

export default function AccessRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const requestId = Number(id)
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<AccessRequestResponse | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await api.get<AccessRequestResponse>(`/access-requests/${requestId}`)
        if (!mounted) return
        setItem(res.data)
      } catch (e: any) {
        toast.error(e?.response?.data?.error || 'Failed to load request')
        navigate('/')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [navigate, requestId])

  const title = useMemo(() => (item ? `Access Request #${item.id}` : 'Access Request'), [item])

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-sm text-muted-foreground">Not found.</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2 items-center">
              <Badge variant={item.status === 'pending' ? 'secondary' : item.status === 'approved' ? 'default' : 'destructive'}>
                {item.status}
              </Badge>
              <span>Scope: <span className="font-medium">{item.scope}</span></span>
              {item.scope === 'temporary' ? (
                <span>Expires: <span className="font-medium">{formatDateTime(item.expiresAt)}</span></span>
              ) : null}
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Back</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Patient</div>
            <div className="font-medium">{item.patient.lname}, {item.patient.fname}</div>
            <div className="text-sm text-muted-foreground">MRN {item.patient.mrn}</div>
            <div className="mt-2">
              <Button asChild size="sm" variant="outline">
                <Link to={`/patients/${item.patient.id}`}>Open Patient</Link>
              </Button>
            </div>
          </div>

          {item.reason ? (
            <div>
              <div className="text-sm font-medium">Reason</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{item.reason}</div>
            </div>
          ) : null}

          {item.resolutionNote ? (
            <div>
              <div className="text-sm font-medium">Resolution note</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{item.resolutionNote}</div>
            </div>
          ) : null}

          <div className="text-xs text-muted-foreground">
            Created: {formatDateTime(item.createdAt)}
            {item.resolvedAt ? <> • Resolved: {formatDateTime(item.resolvedAt)}</> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
