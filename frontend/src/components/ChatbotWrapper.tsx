import { useLocation, matchPath } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ChatbotProvider } from '@/context/ChatbotContext'
import { Chatbot } from '@/components/Chatbot'
import { ChatbotDebugPanel } from '@/components/ChatbotDebugPanel'

export function ChatbotWrapper() {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  const isDevelopment = import.meta.env.DEV

  const allowedChatbotRoutes = [
    '/report_form',
    '/patients/:patientId/reports/new',
    '/patients/:patientId/reports/:reportId/edit',
  ]

  const showChatbot = allowedChatbotRoutes.some((pattern) =>
    Boolean(matchPath({ path: pattern, end: false }, location.pathname))
  )

  return isAuthenticated && showChatbot ? (
    <ChatbotProvider>
      <Chatbot />
      {isDevelopment && <ChatbotDebugPanel />}
    </ChatbotProvider>
  ) : null
}