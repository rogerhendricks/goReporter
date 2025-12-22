import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { 
  UserPlus, 
  FilePlus, 
  CheckSquare, 
  Search, 
  Keyboard,
  Home,
} from "lucide-react"

export function KeyboardShortcuts() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        navigate("/patients/new")
      }
      if (e.key === "r" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        navigate("/reports/new")
      }
      if (e.key === "t" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        navigate("/tasks/new")
      }
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [navigate])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/search"))}>
            <Search className="mr-2 h-4 w-4" />
            <span>Global Search</span>
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => navigate("/patients/new"))}>
            <UserPlus className="mr-2 h-4 w-4" />
            <span>New Patient</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/reports/new"))}>
            <FilePlus className="mr-2 h-4 w-4" />
            <span>New Report</span>
            <CommandShortcut>⌘R</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/tasks/new"))}>
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>New Task</span>
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Help">
          <CommandItem onSelect={() => setOpen(true)}>
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Show Shortcuts</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}