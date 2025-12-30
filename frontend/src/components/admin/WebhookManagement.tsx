import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Trash2, TestTube, Plus, CheckCircle, XCircle, Clock, Zap, Edit } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { webhookService, type Webhook, AVAILABLE_EVENTS } from '@/services/webhookService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'

export function WebhookManagement() {
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
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook Management</CardTitle>
              <CardDescription>
                Configure webhooks to receive real-time notifications for events
              </CardDescription>
            </div>
            <Button onClick={() => navigate('/webhooks/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No webhooks configured</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Get started by creating your first webhook to receive notifications for battery alerts, task reminders, and more.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => {
                const successRate = getSuccessRate(webhook)
                
                return (
                  <Card key={webhook.id} className="border-2">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg">{webhook.name}</CardTitle>
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
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/webhooks/${webhook.id}`)}
                          >
                            <Edit className="h-4 w-4" />
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
                        <div className="text-sm font-medium mb-1">Endpoint URL</div>
                        <div className="text-sm text-muted-foreground font-mono bg-muted px-3 py-2 rounded-md truncate">
                          {webhook.url}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">Events ({webhook.events.length})</div>
                        <div className="flex flex-wrap gap-2">
                          {webhook.events.slice(0, 5).map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {getEventLabel(event)}
                            </Badge>
                          ))}
                          {webhook.events.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{webhook.events.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                          <div className="flex items-center gap-2">
                            {successRate !== null ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">{successRate}%</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">No deliveries</span>
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
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}