import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Info, AlertTriangle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Checkbox } from '../components/ui/checkbox'
import { Switch } from '../components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { webhookService, AVAILABLE_EVENTS, type CreateWebhookRequest } from '../services/webhookService'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'

export default function WebhookFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState<CreateWebhookRequest>({
    name: '',
    url: '',
    events: [],
    secret: '',
    description: '',
    active: true,
    integrationType: 'generic',
    epicClientId: '',
    epicPrivateKey: '',
    epicTokenUrl: '',
    epicFhirBase: '',
  })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)

  useEffect(() => {
    if (isEdit && id) {
      loadWebhook(parseInt(id))
    }
  }, [isEdit, id])

  const loadWebhook = async (webhookId: number) => {
    try {
      const webhook = await webhookService.getById(webhookId)
      setFormData({
        name: webhook.name,
        integrationType: webhook.integrationType || 'generic',
        epicClientId: webhook.epicClientId || '',
        epicPrivateKey: webhook.epicPrivateKey || '',
        epicTokenUrl: webhook.epicTokenUrl || '',
        epicFhirBase: webhook.epicFhirBase || '',
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret || '',
        description: webhook.description || '',
        active: webhook.active,
      })
    } catch (error) {
      console.error('Failed to load webhook:', error)
      toast.error('Failed to load webhook')
      navigate('/webhooks')
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      toast.error('Please enter a webhook name')
      return
    }

    if (!formData.url) {
      toast.error('Please enter a webhook URL')
      return
    }

    if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
      toast.error('Webhook URL must start with http:// or https://')
      return
    }

    if (formData.events.length === 0) {
      toast.error('Please select at least one event')
      return
    }

    // Validate Epic configuration if Epic integration type
    if (formData.integrationType === 'epic') {
      if (!formData.epicClientId) {
        toast.error('Epic Client ID is required for Epic integration')
        return
      }
      if (!formData.epicPrivateKey) {
        toast.error('Epic Private Key is required for Epic integration')
        return
      }
      if (!formData.epicTokenUrl) {
        toast.error('Epic Token URL is required for Epic integration')
        return
      }
      if (!formData.epicFhirBase) {
        toast.error('Epic FHIR Base URL is required for Epic integration')
        return
      }
      // Validate private key format
      if (!formData.epicPrivateKey.includes('BEGIN PRIVATE KEY')) {
        toast.error('Epic Private Key must be in PEM format')
        return
      }
    }

    setLoading(true)

    try {
      if (isEdit && id) {
        await webhookService.update(parseInt(id), formData)
        toast.success('Webhook updated successfully')
      } else {
        await webhookService.create(formData)
        toast.success('Webhook created successfully')
      }
      navigate('/webhooks')
    } catch (error) {
      console.error('Failed to save webhook:', error)
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} webhook`)
    } finally {
      setLoading(false)
    }
  }

  const toggleEvent = (eventValue: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }))
  }

  if (loadingData) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate('/webhooks')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Webhooks
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? 'Edit Webhook' : 'Create Webhook'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure a webhook endpoint to receive real-time notifications
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              General details about this webhook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Slack Battery Alerts"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Webhook URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                The endpoint that will receive POST requests when events occur
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of what this webhook is for"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret">Secret (Optional)</Label>
              <Input
                id="secret"
                type="password"
                placeholder="Shared secret for signature verification"
                value={formData.secret}
                onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                If provided, requests will include an X-Webhook-Signature header with HMAC-SHA256 signature
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Enable or disable this webhook
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration Type</CardTitle>
            <CardDescription>
              Select the type of webhook integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="integrationType">Type</Label>
              <Select
                value={formData.integrationType}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  integrationType: value,
                  // Clear Epic fields when switching away from Epic
                  ...(value !== 'epic' && {
                    epicClientId: '',
                    epicPrivateKey: '',
                    epicTokenUrl: '',
                    epicFhirBase: ''
                  })
                }))}
              >
                <SelectTrigger id="integrationType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic Webhook</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                  <SelectItem value="epic">Epic EMR (FHIR)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.integrationType === 'epic' && 'Sends FHIR R4 DiagnosticReports with OAuth 2.0 authentication'}
                {formData.integrationType === 'teams' && 'Automatically formats messages as Adaptive Cards'}
                {formData.integrationType === 'slack' && 'Sends JSON payloads to Slack webhook'}
                {formData.integrationType === 'generic' && 'Standard JSON webhook payload'}
              </p>
            </div>

            {formData.integrationType === 'epic' && (
              <>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Epic FHIR Configuration Required</AlertTitle>
                  <AlertDescription>
                    Configure your Epic App Orchard credentials below. The private key must be in PEM format (PKCS8).
                    See the <a href="/docs/epic-integration" className="underline">Epic Integration Guide</a> for setup instructions.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4 border-l-4 border-blue-500 pl-4">
                  <div className="space-y-2">
                    <Label htmlFor="epicClientId">Epic Client ID *</Label>
                    <Input
                      id="epicClientId"
                      placeholder="your-epic-client-id"
                      value={formData.epicClientId}
                      onChange={(e) => setFormData(prev => ({ ...prev, epicClientId: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Client ID from Epic App Orchard registration
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="epicPrivateKey">Epic Private Key (PEM) *</Label>
                    <Textarea
                      id="epicPrivateKey"
                      placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQIBADANBgk...&#10;-----END PRIVATE KEY-----"
                      value={formData.epicPrivateKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, epicPrivateKey: e.target.value }))}
                      rows={8}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      RSA private key for JWT signing (PKCS8 PEM format)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="epicTokenUrl">Epic Token URL *</Label>
                    <Input
                      id="epicTokenUrl"
                      placeholder="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
                      value={formData.epicTokenUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, epicTokenUrl: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Epic OAuth 2.0 token endpoint
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="epicFhirBase">Epic FHIR Base URL *</Label>
                    <Input
                      id="epicFhirBase"
                      placeholder="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
                      value={formData.epicFhirBase}
                      onChange={(e) => setFormData(prev => ({ ...prev, epicFhirBase: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Base URL for Epic FHIR R4 API
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Subscriptions *</CardTitle>
            <CardDescription>
              Select which events should trigger this webhook
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Event Payload</AlertTitle>
              <AlertDescription>
                Each webhook will receive a JSON payload with event type, timestamp, and relevant data
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {/* Group events by category */}
              <div>
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Report Events</h3>
                <div className="space-y-3">
                  {AVAILABLE_EVENTS.filter(e => e.value.startsWith('report.')).map((event) => (
                    <div key={event.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={event.value}
                        checked={formData.events.includes(event.value)}
                        onCheckedChange={() => toggleEvent(event.value)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={event.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {event.label}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Battery Events</h3>
                <div className="space-y-3">
                  {AVAILABLE_EVENTS.filter(e => e.value.startsWith('battery.')).map((event) => (
                    <div key={event.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={event.value}
                        checked={formData.events.includes(event.value)}
                        onCheckedChange={() => toggleEvent(event.value)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={event.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {event.label}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Task Events</h3>
                <div className="space-y-3">
                  {AVAILABLE_EVENTS.filter(e => e.value.startsWith('task.')).map((event) => (
                    <div key={event.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={event.value}
                        checked={formData.events.includes(event.value)}
                        onCheckedChange={() => toggleEvent(event.value)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={event.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {event.label}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Consent Events</h3>
                <div className="space-y-3">
                  {AVAILABLE_EVENTS.filter(e => e.value.startsWith('consent.')).map((event) => (
                    <div key={event.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={event.value}
                        checked={formData.events.includes(event.value)}
                        onCheckedChange={() => toggleEvent(event.value)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={event.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {event.label}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Device Events</h3>
                <div className="space-y-3">
                  {AVAILABLE_EVENTS.filter(e => e.value.startsWith('device.')).map((event) => (
                    <div key={event.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={event.value}
                        checked={formData.events.includes(event.value)}
                        onCheckedChange={() => toggleEvent(event.value)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={event.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {event.label}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/webhooks')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update Webhook' : 'Create Webhook'}
          </Button>
        </div>
      </form>
    </div>
  )
}
