import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Trash2, TestTube, ExternalLink, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { webhookService, type Webhook, AVAILABLE_EVENTS } from '../services/webhookService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { format } from 'date-fns'
import { Skeleton } from '../components/ui/skeleton'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'

export default function WebhooksPage() {
  const navigate = useNavigate()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [testingId, setTestingId] = useState<number | null>(null)

  useEffect(() => {
    loadWebhooks()
  }, [])

  const loadWebhooks = async () => {
    try {
      const data = await webhookService.getAll()
      setWebhooks(data)
    } catch (error) {
      console.error('Failed to load webhooks:', error)
      toast.error('Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      await webhookService.delete(deleteId)
      setWebhooks(webhooks.filter(w => w.id !== deleteId))
      toast.success('Webhook deleted successfully')
    } catch (error) {
      console.error('Failed to delete webhook:', error)
      toast.error('Failed to delete webhook')
    } finally {
      setDeleteId(null)
    }
  }

  const handleTest = async (id: number) => {
    setTestingId(id)
    try {
      const result = await webhookService.test(id)
      toast.success(result.message)
    } catch (error) {
      console.error('Failed to test webhook:', error)
      toast.error('Failed to send test webhook')
    } finally {
      setTestingId(null)
    }
  }

  const getEventLabel = (eventValue: string) => {
    const event = AVAILABLE_EVENTS.find(e => e.value === eventValue)
    return event?.label || eventValue
  }

  const getSuccessRate = (webhook: Webhook) => {
    const total = webhook.successCount + webhook.failureCount
    if (total === 0) return null
    return Math.round((webhook.successCount / total) * 100)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

    const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Webhooks', href: '/webhooks', current: true },
    { label: '+ Webhook', href: '/webhooks/new' }
  ]

  return (
    <div className="container mx-auto">
        <BreadcrumbNav items={breadcrumbItems}/>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground mt-1">
            Configure webhooks to receive real-time notifications for events
          </p>
        </div>
      </div>

      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No webhooks configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first webhook to receive notifications for battery alerts, task reminders, and more.
            </p>

          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((webhook) => {
            const successRate = getSuccessRate(webhook)
            
            return (
              <Card key={webhook.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{webhook.name}</CardTitle>
                        <Badge variant={webhook.active ? 'default' : 'secondary'}>
                          {webhook.active ? 'Active' : 'Inactive'}
                        </Badge>
                        {webhook.integrationType && webhook.integrationType !== 'generic' && (
                          <Badge variant="outline" className="capitalize">
                            {webhook.integrationType === 'epic' && '🏥 Epic FHIR'}
                            {webhook.integrationType === 'slack' && '💬 Slack'}
                            {webhook.integrationType === 'teams' && '📋 Teams'}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1.5">
                        {webhook.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(webhook.id)}
                        disabled={testingId === webhook.id}
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        {testingId === webhook.id ? 'Sending...' : 'Test'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/webhooks/${webhook.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Endpoint URL</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono bg-muted px-3 py-2 rounded-md">
                      <span className="flex-1 truncate">{webhook.url}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">Subscribed Events ({webhook.events.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline">
                          {getEventLabel(event)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                      <div className="flex items-center gap-2">
                        {successRate !== null ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">{successRate}%</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">No deliveries yet</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Successful</div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{webhook.successCount}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Failed</div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">{webhook.failureCount}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Last Triggered</div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {webhook.lastTriggeredAt 
                            ? format(new Date(webhook.lastTriggeredAt), 'MMM d, HH:mm')
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone and you will stop receiving notifications for subscribed events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
