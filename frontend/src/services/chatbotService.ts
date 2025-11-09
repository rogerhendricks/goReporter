import axios from 'axios'

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export interface ChatbotContext {
  pageUrl: string
  pageTitle: string
  pageContent: string
  formData?: FormDataExtract
  userRole?: string
  userName?: string
}

export interface FormDataExtract {
  fields: FormField[]
  sections: FormSection[]
  csvData?: string
}

export interface FormField {
  label: string
  value: string
  type: string
  section?: string
}

export interface FormSection {
  title: string
  fields: FormField[]
}

export interface ChatbotRequest {
  message: string
  context: ChatbotContext
  conversationHistory: ChatMessage[]
}

export interface ChatbotResponse {
  message: string
  success: boolean
  error?: string
}

class ChatbotService {
  private readonly webhookUrl: string

  constructor() {
    this.webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || ''
    if (!this.webhookUrl) {
      console.warn('N8N webhook URL is not configured')
    }
  }

  /**
   * Extract form data from the current page and convert to structured format
   */
  private extractFormData(): FormDataExtract | undefined {
    const formElements = document.querySelectorAll('form')
    if (formElements.length === 0) return undefined

    const sections: FormSection[] = []
    const allFields: FormField[] = []

    formElements.forEach(form => {
      // Find all Card components (sections)
      const cards = form.querySelectorAll('[class*="Card"]')
      
      cards.forEach(card => {
        // Get section title from CardHeader
        const titleElement = card.querySelector('[class*="CardTitle"]')
        const sectionTitle = titleElement?.textContent?.trim() || 'General'

        const fields: FormField[] = []

        // Find all input fields within this card
        const inputs = card.querySelectorAll('input, select, textarea')
        
        inputs.forEach(input => {
          const inputElement = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          
          // Skip hidden or disabled fields
          if (inputElement.type === 'hidden' || inputElement.disabled) return

          // Find the associated label
          let label = ''
          const labelElement = card.querySelector(`label[for="${inputElement.id}"]`)
          
          if (labelElement) {
            label = labelElement.textContent?.trim() || ''
          } else {
            // Try to find label by traversing up
            const parentLabel = inputElement.closest('div')?.querySelector('label')
            label = parentLabel?.textContent?.trim() || inputElement.name || inputElement.id || 'Unknown'
          }

          // Get the value
          let value = ''
          if (inputElement.type === 'checkbox') {
            value = (inputElement as HTMLInputElement).checked ? 'Yes' : 'No'
          } else if (inputElement.type === 'radio') {
            if ((inputElement as HTMLInputElement).checked) {
              value = inputElement.value
            } else {
              return // Skip unchecked radio buttons
            }
          } else {
            value = inputElement.value || '(empty)'
          }

          const field: FormField = {
            label: label,
            value: value,
            type: inputElement.type || inputElement.tagName.toLowerCase(),
            section: sectionTitle
          }

          fields.push(field)
          allFields.push(field)
        })

        if (fields.length > 0) {
          sections.push({
            title: sectionTitle,
            fields
          })
        }
      })
    })

    // Generate CSV format
    const csvData = this.generateCSV(allFields)

    return {
      fields: allFields,
      sections,
      csvData
    }
  }

  /**
   * Convert form fields to CSV format
   */
  private generateCSV(fields: FormField[]): string {
    const header = 'Section,Label,Value,Type\n'
    const rows = fields.map(field => {
      const section = this.escapeCSV(field.section || 'General')
      const label = this.escapeCSV(field.label)
      const value = this.escapeCSV(field.value)
      const type = this.escapeCSV(field.type)
      return `${section},${label},${value},${type}`
    }).join('\n')
    
    return header + rows
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  /**
   * Extract page content with improved structure
   */
  extractPageContent(): ChatbotContext {
    const pageUrl = window.location.href
    const pageTitle = document.title || 'Untitled Page'
    
    // Extract form data if available
    const formData = this.extractFormData()
    
    // Extract readable page content
    let pageContent = ''
    
    if (formData) {
      // If we have form data, create a structured summary
      pageContent = this.createFormSummary(formData)
    } else {
      // Fallback: extract general page content
      const contentElements = document.querySelectorAll('main, [role="main"], .content, #content')
      
      contentElements.forEach(element => {
        // Get headings
        const headings = element.querySelectorAll('h1, h2, h3, h4')
        headings.forEach(h => {
          pageContent += `\n## ${h.textContent?.trim()}\n`
        })
        
        // Get paragraph content
        const paragraphs = element.querySelectorAll('p')
        paragraphs.forEach(p => {
          const text = p.textContent?.trim()
          if (text && text.length > 10) {
            pageContent += text + '\n'
          }
        })
      })
    }
    
    // Limit content length
    if (pageContent.length > 3000) {
      pageContent = pageContent.substring(0, 3000) + '...'
    }

    return {
      pageUrl,
      pageTitle,
      pageContent,
      formData
    }
  }

  /**
   * Create a human-readable summary of form data
   */
  private createFormSummary(formData: FormDataExtract): string {
    let summary = 'Form Data Summary:\n\n'
    
    formData.sections.forEach(section => {
      summary += `## ${section.title}\n`
      section.fields.forEach(field => {
        summary += `- ${field.label}: ${field.value}\n`
      })
      summary += '\n'
    })
    
    return summary
  }

  async sendMessage(request: ChatbotRequest): Promise<ChatbotResponse> {
    try {
      if (!this.webhookUrl) {
        throw new Error('Chatbot service is not configured')
      }

      // Prepare the payload with both CSV and structured data
      const payload: any = {
        message: request.message,
        context: {
          pageUrl: request.context.pageUrl,
          pageTitle: request.context.pageTitle,
          pageContent: request.context.pageContent,
          userRole: request.context.userRole,
          userName: request.context.userName,
        },
        conversation_history: request.conversationHistory.slice(-10),
        timestamp: new Date().toISOString()
      }

      // Add form data if available
      if (request.context.formData) {
        payload.formData = {
          csv: request.context.formData.csvData,
          structured: request.context.formData.sections,
          fieldCount: request.context.formData.fields.length
        }
      }

      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })

      return {
        message: response.data.message || response.data.response || 'Sorry, I received an empty response.',
        success: true
      }
    } catch (error) {
      console.error('Chatbot service error:', error)
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return {
            message: 'Request timed out. Please try again.',
            success: false,
            error: 'timeout'
          }
        }
        
        return {
          message: 'Sorry, I\'m having trouble connecting right now. Please try again later.',
          success: false,
          error: error.message
        }
      }

      return {
        message: 'An unexpected error occurred. Please try again.',
        success: false,
        error: 'unknown'
      }
    }
  }

  generateContextualPrompt(userMessage: string, context: ChatbotContext): string {
    let prompt = `User is on page: ${context.pageTitle} (${context.pageUrl})\n\n`
    
    if (context.formData?.csvData) {
      prompt += `Form data (CSV format):\n${context.formData.csvData}\n\n`
    }
    
    prompt += `Page context: ${context.pageContent}\n\n`
    prompt += `User message: ${userMessage}\n\n`
    prompt += `Please help the user with their question, taking into account the current page content and form data.`
    
    return prompt.trim()
  }
}

export const chatbotService = new ChatbotService()