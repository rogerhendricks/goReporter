import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Eye } from 'lucide-react'
import { chatbotService } from '@/services/chatbotService'
import { toast } from 'sonner'

export function ChatbotDebugPanel() {
  const [showDebug, setShowDebug] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)

  const handleExtractData = () => {
    const context = chatbotService.extractPageContent()
    setExtractedData(context)
    setShowDebug(true)
    toast.success('Form data extracted successfully')
  }

  const handleDownloadCSV = () => {
    if (!extractedData?.formData?.csvData) {
      toast.error('No CSV data available')
      return
    }

    const blob = new Blob([extractedData.formData.csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `form-data-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.success('CSV downloaded successfully')
  }

  const handleDownloadJSON = () => {
    if (!extractedData?.formData) {
      toast.error('No form data available')
      return
    }

    const blob = new Blob([JSON.stringify(extractedData.formData, null, 2)], { 
      type: 'application/json' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `form-data-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.success('JSON downloaded successfully')
  }

  return (
    <div className="fixed bottom-24 right-6 z-40">
      <Button
        onClick={handleExtractData}
        variant="outline"
        size="sm"
        className="mb-2"
      >
        <Eye className="w-4 h-4 mr-2" />
        Debug Chatbot Data
      </Button>

      {showDebug && extractedData && (
        <Card className="w-96 max-h-96 overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Extracted Form Data</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebug(false)}
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Badge variant="secondary" className="mb-2">
                {extractedData.formData?.fields.length || 0} fields found
              </Badge>
              
              <div className="flex gap-2 mt-2">
                {extractedData.formData?.csvData && (
                  <Button
                    onClick={handleDownloadCSV}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    CSV
                  </Button>
                )}
                
                {extractedData.formData && (
                  <Button
                    onClick={handleDownloadJSON}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    JSON
                  </Button>
                )}
              </div>
            </div>

            {extractedData.formData?.sections.map((section: any, idx: number) => (
              <div key={idx} className="border-t pt-2">
                <p className="font-semibold text-sm">{section.title}</p>
                <div className="text-xs space-y-1 mt-1">
                  {section.fields.slice(0, 3).map((field: any, fieldIdx: number) => (
                    <div key={fieldIdx} className="flex justify-between">
                      <span className="text-muted-foreground">{field.label}:</span>
                      <span className="font-mono">{field.value.substring(0, 20)}</span>
                    </div>
                  ))}
                  {section.fields.length > 3 && (
                    <p className="text-muted-foreground italic">
                      +{section.fields.length - 3} more fields
                    </p>
                  )}
                </div>
              </div>
            ))}

            <div className="border-t pt-2">
              <p className="text-xs font-semibold mb-1">CSV Preview:</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                {extractedData.formData?.csvData?.split('\n').slice(0, 5).join('\n')}
                {extractedData.formData?.csvData && '\n...'}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}