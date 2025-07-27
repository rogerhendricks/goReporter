import { ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"
 import {Navbar }from "@/components/layout/Navbar"

interface DefaultLayoutProps {
    children: ReactNode
}
export function DefaultLayout({ children }: DefaultLayoutProps) {
    return (
        <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          {children}
          <Toaster />
        </main>
      </div>
    )
}