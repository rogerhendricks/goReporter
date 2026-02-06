import type { ReactNode } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { KeyboardShortcuts } from "../KeyboardShortcuts"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"

interface DefaultLayoutProps {
  children: ReactNode
}

export function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col min-w-0 overflow-hidden">
          <KeyboardShortcuts />
          <Navbar />
          <div className="flex-1 w-full p-4 md:p-6 overflow-x-hidden min-w-0">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}