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
    // Try to find the report form by looking for specific data attributes or structure
    const formElement = document.querySelector('form')
    
    if (!formElement) {
      return undefined
    }

    const fields: FormField[] = []
    const sections: FormSection[] = []
    
    // Extract data from all input elements (including custom components)
    const inputs = formElement.querySelectorAll('input, textarea, select')
    
    inputs.forEach((input) => {
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      
      // Skip empty or hidden fields
      if (!element.name || element.type === 'hidden' || !element.value) {
        return
      }

      // Find the associated label
      let label = ''
      const labelElement = formElement.querySelector(`label[for="${element.id}"]`)
      if (labelElement) {
        label = labelElement.textContent?.trim() || ''
      } else {
        // Try to find label by traversing up the DOM
        const closestLabel = element.closest('div')?.querySelector('label')
        if (closestLabel) {
          label = closestLabel.textContent?.trim() || ''
        }
      }

      // Use name as fallback if no label found
      if (!label) {
        label = element.name
      }

      // Try to find the section this field belongs to
      let section = ''
      const cardTitle = element.closest('.space-y-6, .space-y-4, .grid')
        ?.closest('div')
        ?.querySelector('[class*="CardTitle"], h3, h4')
      
      if (cardTitle) {
        section = cardTitle.textContent?.trim() || ''
      }

      fields.push({
        label,
        value: element.value,
        type: element.type || 'text',
        section
      })
    })

    // Group fields by section
    const sectionMap = new Map<string, FormField[]>()
    
    fields.forEach(field => {
      const sectionName = field.section || 'General'
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, [])
      }
      sectionMap.get(sectionName)!.push(field)
    })

    sectionMap.forEach((fields, title) => {
      sections.push({ title, fields })
    })

    // Generate CSV
    const csvData = this.convertToCSV(fields)

    return {
      fields,
      sections,
      csvData
    }
  }

  /**
   * Convert form fields to CSV format
   */
  private convertToCSV(fields: FormField[]): string {
    if (fields.length === 0) return ''

    // Create CSV header
    const header = 'Section,Field,Value,Type'
    
    // Create CSV rows
    const rows = fields.map(field => {
      const section = field.section || 'General'
      const fieldName = field.label
      const value = field.value.replace(/"/g, '""') // Escape quotes
      const type = field.type
      
      return `"${section}","${fieldName}","${value}","${type}"`
    })

    return [header, ...rows].join('\n')
  }

  // /**
  //  * Escape CSV values
  //  */
  // private escapeCSV(value: string): string {
  //   if (value.includes(',') || value.includes('"') || value.includes('\n')) {
  //     return `"${value.replace(/"/g, '""')}"`
  //   }
  //   return value
  // }

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