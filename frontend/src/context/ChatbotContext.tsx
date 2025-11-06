import React, { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useChatbot } from '@/hooks/useChatbot'
import type { UseChatbotReturn } from '@/hooks/useChatbot'

const ChatbotContext = createContext<UseChatbotReturn | undefined>(undefined)

interface ChatbotProviderProps {
  children: ReactNode
}

export const ChatbotProvider: React.FC<ChatbotProviderProps> = ({ children }) => {
  const chatbotValue = useChatbot()

  return (
    <ChatbotContext.Provider value={chatbotValue}>
      {children}
    </ChatbotContext.Provider>
  )
}

export const useChatbotContext = (): UseChatbotReturn => {
  const context = useContext(ChatbotContext)
  if (context === undefined) {
    throw new Error('useChatbotContext must be used within a ChatbotProvider')
  }
  return context
}

// Export a hook for components that want to trigger the chatbot
export const useChatbotTrigger = () => {
  const { openChat, sendMessage } = useChatbotContext()
  
  const askQuestion = (question: string) => {
    openChat()
    setTimeout(() => sendMessage(question), 500) // Small delay to ensure chat is open
  }
  
  return { openChat, askQuestion }
}