import type { ReactNode } from 'react'
import { DefaultLayout } from './DefaultLayout'
import { HomeLayout } from './HomeLayout'


interface LayoutWrapperProps {
  children: ReactNode
  layout?: 'default' | 'home'
}

export function LayoutWrapper({ children, layout = 'default' }: LayoutWrapperProps) {
  switch (layout) {
    case 'home':
      return <HomeLayout>{children}</HomeLayout>
    case 'default':
    default:
      return <DefaultLayout>{children}</DefaultLayout>
  }
}