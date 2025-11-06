import { useState, useCallback, useRef, useEffect } from 'react'
import { chatbotService } from '@/services/chatbotService'
import type { ChatMessage, ChatbotContext } from '@/services/chatbotService'
import { useAuthStore } from '@/stores/authStore'

export interface UseChatbotReturn {
  messages: ChatMessage[]
  isLoading: boolean
  isOpen: boolean
  error: string | null
  sendMessage: (message: string) => Promise<void>
  clearMessages: () => void
  toggleChat: () => void
  openChat: () => void
  closeChat: () => void
}

export const useChatbot = (): UseChatbotReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const conversationIdRef = useRef<string>(Date.now().toString())
  const { user } = useAuthStore()

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        content: 'Hi! I\'m here to help you navigate and understand this application. I can see what\'s on your current page and assist you with any questions you might have.',
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [messages.length])

  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const addMessage = useCallback((content: string, role: 'user' | 'assistant'): ChatMessage => {
    const message: ChatMessage = {
      id: generateMessageId(),
      content,
      role,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, message])
    return message
  }, [generateMessageId])

  const sendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return

    setError(null)
    setIsLoading(true)

    // Add user message
    addMessage(messageContent, 'user')

    try {
      // Extract current page context
      const context: ChatbotContext = {
        ...chatbotService.extractPageContent(),
        userRole: user?.role,
        userName: user?.username || user?.email
      }

      // Send to chatbot service
      const response = await chatbotService.sendMessage({
        message: messageContent,
        context,
        conversationHistory: messages
      })

      if (response.success) {
        addMessage(response.message, 'assistant')
      } else {
        setError(response.error || 'Failed to get response')
        addMessage('Sorry, I encountered an error. Please try again.', 'assistant')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      addMessage('Sorry, I\'m having trouble right now. Please try again later.', 'assistant')
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, user, addMessage])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    conversationIdRef.current = Date.now().toString()
  }, [])

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const openChat = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeChat = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    messages,
    isLoading,
    isOpen,
    error,
    sendMessage,
    clearMessages,
    toggleChat,
    openChat,
    closeChat
  }
}