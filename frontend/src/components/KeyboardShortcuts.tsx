import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { 
  UserPlus, 
  FilePlus, 
  CheckSquare, 
  Search, 
  Keyboard,
  Home,
  User,
  Heart,
  FileText,
  Stethoscope,
  Zap,
  Loader2,
  Clock,
  X,
} from "lucide-react"
import { globalSearchService, type GlobalSearchResult, type EntityType } from "@/services/globalSearchService"
import { useDebounce } from "@/hooks/useDebounce"

export function KeyboardShortcuts() {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<GlobalSearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchHistory, setSearchHistory] = React.useState<string[]>([])
  const [selectedType] = React.useState<EntityType>("all")
  const navigate = useNavigate()
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Load search history on mount
  React.useEffect(() => {
    setSearchHistory(globalSearchService.getHistory())
  }, [open])

  // Perform search when debounced query changes
  React.useEffect(() => {
    if (debouncedSearch.trim().length >= 3) {
      performSearch(debouncedSearch)
    } else {
      setSearchResults([])
    }
  }, [debouncedSearch, selectedType])

  const performSearch = async (query: string) => {
    setIsSearching(true)
    try {
      const response = await globalSearchService.search({
        q: query,
        type: selectedType,
        limit: 10,
      })
      setSearchResults(response.results || [])
      setSearchHistory(globalSearchService.getHistory())
    } catch (error) {
      console.error("Search failed:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

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

    const toggle = () => setOpen((open) => !open)

    document.addEventListener("keydown", down)
    document.addEventListener("toggle-command-palette", toggle)
    return () => {
      document.removeEventListener("keydown", down)
      document.removeEventListener("toggle-command-palette", toggle)
    }
  }, [navigate])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    setSearchQuery("")
    setSearchResults([])
    command()
  }, [])

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'patient': return <User className="mr-2 h-4 w-4" />
      case 'device': return <Heart className="mr-2 h-4 w-4" />
      case 'report': return <FileText className="mr-2 h-4 w-4" />
      case 'doctor': return <Stethoscope className="mr-2 h-4 w-4" />
      case 'task': return <CheckSquare className="mr-2 h-4 w-4" />
      case 'lead': return <Zap className="mr-2 h-4 w-4" />
      default: return <Search className="mr-2 h-4 w-4" />
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchQuery("")
      setSearchResults([])
    }
  }

 return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden shadow-lg p-2 border-5 border-color-primary/20 radius-xl">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search for patients, devices, reports, tasks..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {/* Search Results */}
            {searchQuery && (
              <>
                {searchQuery.trim().length < 3 && (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    Type at least 3 characters to search...
                  </div>
                )}

                {searchQuery.trim().length >= 3 && isSearching && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                {searchQuery.trim().length >= 3 && !isSearching && searchResults.length === 0 && (
                  <CommandEmpty>No results found for "{searchQuery}"</CommandEmpty>
                )}

                {searchQuery.trim().length >= 3  && !isSearching && searchResults.length > 0 && (
                  <CommandGroup heading="Search Results">
                    {searchResults.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        onSelect={() => runCommand(() => navigate(result.url))}
                        className="flex items-start gap-2"
                      >
                        {getEntityIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{result.title}</span>
                            <Badge variant="secondary" className="text-xs">
                              {globalSearchService.getEntityLabel(result.type as EntityType)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          {result.description && (
                            <p className="text-xs text-muted-foreground/70 truncate">{result.description}</p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}

            {/* Search History */}
            {!searchQuery && searchHistory.length > 0 && (
              <CommandGroup heading="Recent Searches">
                {searchHistory.slice(0, 5).map((query, index) => (
                  <CommandItem
                    key={`history-${index}`}
                    onSelect={() => setSearchQuery(query)}
                  >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{query}</span>
                  </CommandItem>
                ))}
                <CommandItem
                  onSelect={() => {
                    globalSearchService.clearHistory()
                    setSearchHistory([])
                  }}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 h-4 w-4" />
                  <span>Clear history</span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Quick Actions - show when not searching */}
            {!searchQuery && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Quick Actions">
                  <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </CommandItem>
                  <CommandItem onSelect={() => runCommand(() => navigate("/patients/search"))}>
                    <Search className="mr-2 h-4 w-4" />
                    <span>Advanced Patient Search</span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="New">
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
                    <span>Keyboard Shortcuts</span>
                    <CommandShortcut>?</CommandShortcut>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}