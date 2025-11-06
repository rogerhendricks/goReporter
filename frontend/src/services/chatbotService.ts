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
  userRole?: string
  userName?: string
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

  async sendMessage(request: ChatbotRequest): Promise<ChatbotResponse> {
    try {
      if (!this.webhookUrl) {
        throw new Error('Chatbot service is not configured')
      }

      const response = await axios.post(this.webhookUrl, {
        message: request.message,
        context: request.context,
        conversation_history: request.conversationHistory.slice(-10), // Send last 10 messages for context
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
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

  extractPageContent(): ChatbotContext {
    const pageUrl = window.location.href
    const pageTitle = document.title || 'Untitled Page'
    
    // Extract meaningful content from the page
    const contentElements = document.querySelectorAll('main, [role="main"], .content, #content, .container')
    let pageContent = ''
    
    if (contentElements.length > 0) {
      // Get text content from main content areas
      contentElements.forEach(element => {
        pageContent += element.textContent?.trim() + ' '
      })
    } else {
      // Fallback: get all visible text content
      const bodyText = document.body.textContent || ''
      pageContent = bodyText.replace(/\s+/g, ' ').trim()
    }
    
    // Limit content length to avoid overwhelming the API
    if (pageContent.length > 2000) {
      pageContent = pageContent.substring(0, 2000) + '...'
    }

    return {
      pageUrl,
      pageTitle,
      pageContent
    }
  }

  generateContextualPrompt(userMessage: string, context: ChatbotContext): string {
    return `
User is on page: ${context.pageTitle} (${context.pageUrl})
Page content: ${context.pageContent}

User message: ${userMessage}

Please help the user with their question, taking into account the current page content and context.
    `.trim()
  }
}

export const chatbotService = new ChatbotService()