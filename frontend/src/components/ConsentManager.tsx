import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon, Plus, XCircle, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { consentService, type PatientConsent, type ConsentType } from '@/services/consentService'

interface ConsentManagerProps {
  patientId: number
}

const consentTypeLabels: Record<ConsentType, string> = {
  TREATMENT: 'Treatment',
  DATA_SHARING: 'Data Sharing',
  RESEARCH: 'Research',
  MARKETING: 'Marketing',
  THIRD_PARTY: 'Third Party Access',
  ELECTRONIC_COMMUNICATION: 'Electronic Communication',
  PHOTO_VIDEO: 'Photo/Video',
}

export function ConsentManager({ patientId }: ConsentManagerProps) {
  const [consents, setConsents] = useState<PatientConsent[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ConsentType>('TREATMENT')
  const [expiryDate, setExpiryDate] = useState<Date>()
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchConsents()
  }, [patientId])

  const fetchConsents = async () => {
    try {
      setLoading(true)
      const data = await consentService.getPatientConsents(patientId)
      setConsents(data)
    } catch (error) {
      toast.error('Failed to fetch consents')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateConsent = async () => {
    try {
      await consentService.createConsent({
        patientId,
        consentType: selectedType,
        expiryDate: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : undefined,
        notes,
      })
      toast.success('Consent recorded successfully')
      setIsDialogOpen(false)
      setNotes('')
      setExpiryDate(undefined)
      fetchConsents()
    } catch (error) {
      toast.error('Failed to create consent')
      console.error(error)
    }
  }

  const handleRevokeConsent = async (consentId: number) => {
    if (!window.confirm('Are you sure you want to revoke this consent?')) return

    try {
      await consentService.revokeConsent(consentId, 'Revoked by user request')
      toast.success('Consent revoked successfully')
      fetchConsents()
    } catch (error) {
      toast.error('Failed to revoke consent')
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'GRANTED':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Active</Badge>
      case 'REVOKED':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Revoked</Badge>
      case 'EXPIRED':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Expired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Patient Consents</CardTitle>
            <CardDescription>Manage patient consent for various purposes (HIPAA compliance)</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Consent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record New Consent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Consent Type</Label>
                  <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ConsentType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(consentTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expiry Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn('w-full justify-start text-left font-normal', !expiryDate && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiryDate ? format(expiryDate, 'PPP') : 'No expiry'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes about this consent..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button onClick={handleCreateConsent} className="w-full">
                  Record Consent
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading consents...</div>
        ) : consents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No consent records found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Granted Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consents.map((consent) => (
                <TableRow key={consent.ID}>
                  <TableCell>{consentTypeLabels[consent.consentType]}</TableCell>
                  <TableCell>{getStatusBadge(consent.status)}</TableCell>
                  <TableCell>{format(new Date(consent.grantedDate), 'PPP')}</TableCell>
                  <TableCell>{consent.expiryDate ? format(new Date(consent.expiryDate), 'PPP') : 'No expiry'}</TableCell>
                  <TableCell className="max-w-xs truncate">{consent.notes || '-'}</TableCell>
                  <TableCell>
                    {consent.status === 'GRANTED' && (
                      <Button variant="destructive" size="sm" onClick={() => handleRevokeConsent(consent.ID)}>
                        Revoke
                      </Button>
                    )}
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