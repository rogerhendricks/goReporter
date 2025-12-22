import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"
import {Navbar }from "@/components/layout/Navbar"
import { KeyboardShortcuts } from "../KeyboardShortcuts"

interface DefaultLayoutProps {
    children: ReactNode
}
export function DefaultLayout({ children }: DefaultLayoutProps) {
    return (
        <div className="flex flex-col min-h-screen">
        <KeyboardShortcuts />
        <Navbar />
        <main className=" container mx-auto flex-grow px-4 py-6">
          {children}
          <Toaster />
        </main>
      </div>
    )
}