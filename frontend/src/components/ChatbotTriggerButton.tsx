import React from 'react'
import { Button } from '@/components/ui/button'
import { HelpCircle, MessageSquare } from 'lucide-react'
import { useChatbotTrigger } from '@/context/ChatbotContext'

interface ChatbotTriggerButtonProps {
  question?: string
  variant?: 'help' | 'chat'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const ChatbotTriggerButton: React.FC<ChatbotTriggerButtonProps> = ({
  question,
  variant = 'help',
  size = 'sm',
  className
}) => {
  const { openChat, askQuestion } = useChatbotTrigger()

  const handleClick = () => {
    if (question) {
      askQuestion(question)
    } else {
      openChat()
    }
  }

  const icons = {
    help: HelpCircle,
    chat: MessageSquare
  }

  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  const Icon = icons[variant]

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={`${sizes[size]} p-0 ${className}`}
      title={question ? `Ask: "${question}"` : 'Open Assistant'}
    >
      <Icon className="w-4 h-4" />
    </Button>
  )
}

// Pre-defined question buttons for common help scenarios
export const ChatbotHelpButtons = {
  Navigation: () => (
    <ChatbotTriggerButton
      question="How do I navigate around this application?"
      variant="help"
      className="ml-2"
    />
  ),
  
  CurrentPage: () => (
    <ChatbotTriggerButton
      question="Can you explain what I can do on this page?"
      variant="help"
      className="ml-2"
    />
  ),
  
  Forms: () => (
    <ChatbotTriggerButton
      question="How do I fill out this form correctly?"
      variant="help"
      className="ml-2"
    />
  ),
  
  Data: () => (
    <ChatbotTriggerButton
      question="Can you explain what this data means?"
      variant="help"
      className="ml-2"
    />
  ),
  
  Features: () => (
    <ChatbotTriggerButton
      question="What features are available in this application?"
      variant="help"
      className="ml-2"
    />
  )
}