import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatbotState {
  isEnabled: boolean
  isFirstTime: boolean
  hasSeenWelcome: boolean
  setEnabled: (enabled: boolean) => void
  setFirstTime: (isFirst: boolean) => void
  setHasSeenWelcome: (seen: boolean) => void
}

export const useChatbotStore = create<ChatbotState>()(
  persist(
    (set) => ({
      isEnabled: true,
      isFirstTime: true,
      hasSeenWelcome: false,
      
      setEnabled: (enabled: boolean) => set({ isEnabled: enabled }),
      setFirstTime: (isFirst: boolean) => set({ isFirstTime: isFirst }),
      setHasSeenWelcome: (seen: boolean) => set({ hasSeenWelcome: seen }),
    }),
    {
      name: 'chatbot-settings',
    }
  )
)