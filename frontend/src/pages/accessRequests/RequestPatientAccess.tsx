import { useMemo, useState } from 'react'
import api from '@/utils/axios'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

type PatientLookup = {
  id: number
  mrn: number
  fname: string
  lname: string
  dob?: string
}

type Scope = 'temporary' | 'permanent'

export default function RequestPatientAccess() {
  const [mrn, setMrn] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [patient, setPatient] = useState<PatientLookup | null>(null)

  const [scope, setScope] = useState<Scope>('temporary')
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(() => {
    if (!patient) return false
    if (scope === 'temporary' && !expiresAt) return false
    return true
  }, [expiresAt, patient, scope])

  const lookup = async () => {
    const mrnVal = mrn.trim()
    if (!mrnVal) {
      toast.error('Enter an MRN')
      return
    }
    setLookupLoading(true)
    try {
      const res = await api.get<PatientLookup>('/access-requests/patient-lookup', {
        params: { mrn: mrnVal }
      })
      setPatient(res.data)
      toast.success('Patient found')
    } catch (e: any) {
      setPatient(null)
      toast.error(e?.response?.data?.error || 'Patient not found')
    } finally {
      setLookupLoading(false)
    }
  }

  const submit = async () => {
    if (!patient) return
    if (scope === 'temporary' && !expiresAt) {
      toast.error('Temporary requests require an expiry date')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/access-requests', {
        patientId: patient.id,
        scope,
        expiresAt: scope === 'temporary' && expiresAt ? expiresAt.toISOString() : null,
        reason
      })
      toast.success('Access request submitted')
      // Keep patient displayed so user can submit another if needed
      setReason('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Patient Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Patient MRN</Label>
            <div className="flex gap-2">
              <Input
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                placeholder="Enter MRN"
                inputMode="numeric"
              />
              <Button onClick={lookup} disabled={lookupLoading}>
                {lookupLoading ? 'Searching…' : 'Lookup'}
              </Button>
            </div>
          </div>

          {patient ? (
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {patient.lname}, {patient.fname}
                  </div>
                  <div className="text-sm text-muted-foreground">MRN {patient.mrn}</div>
                </div>
                <Badge variant="secondary">Ready</Badge>
              </div>

              <div className="space-y-2">
                <Label>Scope</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={scope === 'temporary' ? 'default' : 'outline'}
                    onClick={() => setScope('temporary')}
                  >
                    Temporary
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={scope === 'permanent' ? 'default' : 'outline'}
                    onClick={() => setScope('permanent')}
                  >
                    Permanent
                  </Button>
                </div>
              </div>

              {scope === 'temporary' ? (
                <div className="space-y-2">
                  <Label>Expiry date</Label>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiresAt ? format(expiresAt, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={expiresAt} onSelect={setExpiresAt} autoFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Short reason for requesting access"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={submit} disabled={!canSubmit || submitting}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
