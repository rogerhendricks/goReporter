import type { ReactNode } from 'react'
import { AbstractBackground } from '../visual/AbstractBackground'

interface HomeLayoutProps {
  children: ReactNode
}

export function HomeLayout({ children }: HomeLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-500 dark:to-gray-800 relative overflow-hidden">
      <AbstractBackground className="absolute inset-0 z-0" />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {children}
      </div>
    </div>
  )
}