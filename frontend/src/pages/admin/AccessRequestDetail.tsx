import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '@/utils/axios'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

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

function parseDate(input?: string | null): Date | undefined {
  if (!input) return undefined
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return undefined
  return d
}

export default function AccessRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const requestId = Number(id)

  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<AccessRequestResponse | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [tempExpiry, setTempExpiry] = useState<Date | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const isTemporary = item?.scope === 'temporary'
  const isPending = item?.status === 'pending'

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await api.get<AccessRequestResponse>(`/admin/access-requests/${requestId}`)
        if (!mounted) return
        setItem(res.data)
        setResolutionNote(res.data.resolutionNote || '')
        setTempExpiry(parseDate(res.data.expiresAt))
      } catch (e: any) {
        toast.error(e?.response?.data?.error || 'Failed to load request')
        navigate('/admin')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [navigate, requestId])

  const title = useMemo(() => {
    if (!item) return 'Access Request'
    return `Access Request #${item.id}`
  }, [item])

  const approve = async () => {
    if (!item) return
    if (!isPending) return
    if (item.scope === 'temporary' && !tempExpiry) {
      toast.error('Temporary approvals require an expiry date')
      return
    }

    setSubmitting(true)
    try {
      const payload: any = { resolutionNote }
      if (item.scope === 'temporary' && tempExpiry) {
        payload.expiresAt = tempExpiry.toISOString()
      }
      const res = await api.put<AccessRequestResponse>(
        `/admin/access-requests/${item.id}/approve`,
        payload,
      )
      setItem(res.data)
      toast.success('Request approved')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to approve request')
    } finally {
      setSubmitting(false)
    }
  }

  const deny = async () => {
    if (!item) return
    if (!isPending) return

    setSubmitting(true)
    try {
      const res = await api.put<AccessRequestResponse>(
        `/admin/access-requests/${item.id}/deny`,
        { resolutionNote },
      )
      setItem(res.data)
      toast.success('Request denied')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to deny request')
    } finally {
      setSubmitting(false)
    }
  }

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
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant={item.status === 'pending' ? 'secondary' : item.status === 'approved' ? 'default' : 'destructive'}>
                {item.status}
              </Badge>
              <span className="ml-2">Scope: <span className="font-medium">{item.scope}</span></span>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin">Back</Link>
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Patient</div>
              <div className="font-medium">
                {item.patient.lname}, {item.patient.fname}
              </div>
              <div className="text-sm text-muted-foreground">MRN {item.patient.mrn}</div>
              <div className="mt-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/patients/${item.patient.id}`}>Open Patient</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Requested By</div>
              <div className="font-medium">{item.requesterUser.fullName || item.requesterUser.username}</div>
              <div className="text-sm text-muted-foreground">@{item.requesterUser.username}</div>
            </div>
          </div>

          {item.reason ? (
            <div>
              <div className="text-sm font-medium">Reason</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{item.reason}</div>
            </div>
          ) : null}

          {isTemporary ? (
            <div className="space-y-2">
              <Label>Temporary expiry</Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={!isPending}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tempExpiry ? format(tempExpiry, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={tempExpiry}
                    onSelect={setTempExpiry}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Resolution note (optional)</Label>
            <Textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Add a short note for the requester…"
              disabled={!isPending}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <Button
              variant="destructive"
              onClick={deny}
              disabled={!isPending || submitting}
            >
              Deny
            </Button>
            <Button
              onClick={approve}
              disabled={!isPending || submitting || (item.scope === 'temporary' && !tempExpiry)}
            >
              Approve
            </Button>
          </div>

          {item.resolvedAt ? (
            <div className="text-xs text-muted-foreground">
              Resolved: {format(new Date(item.resolvedAt), 'PPpp')}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
