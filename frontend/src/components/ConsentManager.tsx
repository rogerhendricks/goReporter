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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon, Plus, XCircle, CheckCircle, Clock, HelpCircle, Edit, Save, X, Trash2, FileText, AlertTriangle, Loader2} from 'lucide-react'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/ui/loading-skeletons'
import ReactMarkdown from 'react-markdown'
import { consentService, type PatientConsent, type ConsentType } from '@/services/consentService'

interface ConsentManagerProps {
  patientId: number
}

const TERMS_VERSION = '1.0'

const consentTypeLabels: Record<ConsentType, string> = {
  REMOTE_HOME_MONITORING: 'Remote Home Monitoring',
  TREATMENT: 'Treatment',
  DATA_SHARING: 'Data Sharing',
  RESEARCH: 'Research',
  THIRD_PARTY: 'Third Party Access',
  ELECTRONIC_COMMUNICATION: 'Electronic Communication',
  PHOTO_VIDEO: 'Photo/Video',
}

export function ConsentManager({ patientId }: ConsentManagerProps) {
  const [reacceptDialogOpen, setReacceptDialogOpen] = useState(false)
  const [reacceptingConsentId, setReacceptingConsentId] = useState<number | null>(null)
  const [reacceptTermsContent, setReacceptTermsContent] = useState('')
  const [reacceptTermsAccepted, setReacceptTermsAccepted] = useState(false)
  const [loadingReacceptTerms, setLoadingReacceptTerms] = useState(false)
  const [consents, setConsents] = useState<PatientConsent[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ConsentType>('TREATMENT')
  const [expiryDate, setExpiryDate] = useState<Date>()
  const [notes, setNotes] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsContent, setTermsContent] = useState('')
  const [loadingTerms, setLoadingTerms] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{
    consentType: ConsentType
    expiryDate?: Date
    notes: string
  }>({
    consentType: 'TREATMENT',
    expiryDate: undefined,
    notes: ''
  })

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

  // Load terms when consent type changes
  useEffect(() => {
    if (isDialogOpen) {
      loadTerms(selectedType)
      setTermsAccepted(false) // Reset acceptance when type changes
    }
  }, [selectedType, isDialogOpen])

  const loadTerms = async (consentType: ConsentType) => {
    setLoadingTerms(true)
    try {
      const terms = await consentService.getTerms(consentType)
      setTermsContent(terms)
    } catch (error) {
      console.error('Error loading terms:', error)
      setTermsContent('# Terms and Conditions\n\nUnable to load terms at this time.')
    } finally {
      setLoadingTerms(false)
    }
  }

  const handleCreateConsent = async () => {
    if (!termsAccepted) {
      toast.error('You must accept the terms and conditions')
      return
    }

    try {
      await consentService.createConsent({
        patientId,
        consentType: selectedType,
        expiryDate: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : undefined,
        notes,
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
      })
      toast.success('Consent recorded successfully')
      setIsDialogOpen(false)
      setNotes('')
      setExpiryDate(undefined)
      setTermsAccepted(false)
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

  const handleDeleteConsent = async (consentId: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this consent? This action cannot be undone.')) return

    try {
      await consentService.deleteConsent(consentId)
      toast.success('Consent deleted successfully')
      fetchConsents()
    } catch (error) {
      toast.error('Failed to delete consent')
      console.error(error)
    }
  }

  const startEdit = (consent: PatientConsent) => {
    setEditingId(consent.ID)
    setEditForm({
      consentType: consent.consentType,
      expiryDate: consent.expiryDate ? new Date(consent.expiryDate) : undefined,
      notes: consent.notes || ''
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({
      consentType: 'TREATMENT',
      expiryDate: undefined,
      notes: ''
    })
  }

  const saveEdit = async (consentId: number) => {
    try {
      await consentService.updateConsent(consentId, {
        consentType: editForm.consentType,
        expiryDate: editForm.expiryDate ? format(editForm.expiryDate, 'yyyy-MM-dd') : undefined,
        notes: editForm.notes
      })
      toast.success('Consent updated successfully')
      setEditingId(null)
      fetchConsents()
    } catch (error) {
      toast.error('Failed to update consent')
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

  // Function to open terms re-acceptance dialog
const openReacceptDialog = async (consent: PatientConsent) => {
  setReacceptingConsentId(consent.ID)
  setReacceptTermsAccepted(false)
  setReacceptDialogOpen(true)
  
  // Load terms for the consent type
  setLoadingReacceptTerms(true)
  try {
    const terms = await consentService.getTerms(consent.consentType)
    setReacceptTermsContent(terms)
  } catch (error) {
    console.error('Error loading terms:', error)
    setReacceptTermsContent('# Terms and Conditions\n\nUnable to load terms at this time.')
  } finally {
    setLoadingReacceptTerms(false)
  }
}

// Function to handle terms re-acceptance
const handleReacceptTerms = async () => {
  if (!reacceptTermsAccepted || !reacceptingConsentId) return

  try {
    await consentService.reacceptTerms(reacceptingConsentId, TERMS_VERSION)
    toast.success('Terms re-accepted successfully')
    setReacceptDialogOpen(false)
    setReacceptingConsentId(null)
    fetchConsents()
  } catch (error) {
    toast.error('Failed to re-accept terms')
    console.error(error)
  }
}

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Patient Consents</CardTitle>
            <CardDescription>Manage patient consent for various purposes.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setTermsAccepted(false)
              setNotes('')
              setExpiryDate(undefined)
            }
          }}>
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

                {/* Terms and Conditions Display */}
                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <Label>Terms and Conditions</Label>
                  </div>
                  <Card className="flex-1 min-h-0">
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                      {loadingTerms ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="ml-2">Loading terms...</span>
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown 
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-lg font-semibold mb-3 mt-4" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-base font-semibold mb-2 mt-3" {...props} />,
                              p: ({node, ...props}) => <p className="mb-2" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                              li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            }}
                          >
                            {termsContent}
                          </ReactMarkdown>
                        </div>
                      )}
                    </ScrollArea>
                  </Card>
                </div>

                {/* Terms Acceptance Checkbox */}
                <div className="flex items-center space-x-2 py-2">
                  <Checkbox 
                    id="accept-terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                  />
                  <label
                    htmlFor="accept-terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I have read and accept the terms and conditions
                  </label>
                </div>

                <Separator />

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
          <TableSkeleton rows={5} columns={8} />
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
                <TableHead>Terms</TableHead>
                <TableHead className="w-[50px]">Note</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consents.map((consent) => {
                const isEditing = editingId === consent.ID
                
                return (
                  <TableRow key={consent.ID}>
                    <TableCell>
                      {isEditing ? (
                        <Select 
                          value={editForm.consentType} 
                          onValueChange={(value) => setEditForm({...editForm, consentType: value as ConsentType})}
                        >
                          <SelectTrigger className="w-full">
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
                      ) : (
                        consentTypeLabels[consent.consentType]
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(consent.status)}</TableCell>
                    <TableCell>{format(new Date(consent.grantedDate), 'PPP')}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn('w-full justify-start text-left font-normal text-xs', !editForm.expiryDate && 'text-muted-foreground')}
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {editForm.expiryDate ? format(editForm.expiryDate, 'PPP') : 'No expiry'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar 
                              mode="single" 
                              selected={editForm.expiryDate} 
                              onSelect={(date) => setEditForm({...editForm, expiryDate: date})} 
                              initialFocus 
                            />
                            {editForm.expiryDate && (
                              <div className="p-3 border-t">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => setEditForm({...editForm, expiryDate: undefined})}
                                >
                                  Clear Date
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        consent.expiryDate ? format(new Date(consent.expiryDate), 'PPP') : 'No expiry'
                      )}
                    </TableCell>
                    <TableCell>
                      {consent.termsAccepted && (
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                              <span className="text-xs">v{consent.termsVersion}</span>
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">Terms Acceptance</h4>
                              <p className="text-sm text-muted-foreground">
                                Accepted on: {consent.termsAcceptedAt ? format(new Date(consent.termsAcceptedAt), 'PPP p') : 'N/A'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Version: {consent.termsVersion}
                              </p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                              <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">Edit Notes</h4>
                              <Textarea
                                placeholder="Notes..."
                                value={editForm.notes}
                                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                                rows={3}
                                className="text-sm"
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : consent.notes ? (
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">Notes</h4>
                              <p className="text-sm text-muted-foreground">{consent.notes}</p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => saveEdit(consent.ID)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => startEdit(consent)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {consent.status === 'GRANTED' && consent.termsVersion !== TERMS_VERSION && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2"
                                onClick={() => openReacceptDialog(consent)}
                                title="Re-accept updated terms"
                              >
                                <FileText className="h-4 w-4 text-yellow-600 mr-1" />
                                <span className="text-xs">Re-accept</span>
                              </Button>
                            )}

                            {consent.status === 'GRANTED' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleRevokeConsent(consent.ID)}
                              >
                                <XCircle className="h-4 w-4 text-orange-600" />
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteConsent(consent.ID)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    {/* Add re-acceptance dialog HERE */}
      <Dialog open={reacceptDialogOpen} onOpenChange={(open) => {
        setReacceptDialogOpen(open)
        if (!open) {
          setReacceptTermsAccepted(false)
          setReacceptingConsentId(null)
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Re-accept Updated Terms and Conditions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Terms Have Been Updated</AlertTitle>
              <AlertDescription>
                The terms and conditions have been updated. Please review and re-accept to continue.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <Label>Updated Terms and Conditions</Label>
              </div>
              <Card className="flex-1 min-h-0">
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  {loadingReacceptTerms ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading terms...</span>
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown 
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-semibold mb-3 mt-4" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-semibold mb-2 mt-3" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                          li: ({node, ...props}) => <li className="mb-1" {...props} />,
                        }}
                      >
                        {reacceptTermsContent}
                      </ReactMarkdown>
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Checkbox 
                id="reaccept-terms" 
                checked={reacceptTermsAccepted}
                onCheckedChange={(checked) => setReacceptTermsAccepted(!!checked)}
              />
              <label
                htmlFor="reaccept-terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have read and accept the updated terms and conditions
              </label>
            </div>

            <Button 
              onClick={handleReacceptTerms} 
              className="w-full"
              disabled={!reacceptTermsAccepted || loadingReacceptTerms}
            >
              Re-accept Terms
            </Button>
          </div>
        </DialogContent>
      </Dialog>
</>
  )
}