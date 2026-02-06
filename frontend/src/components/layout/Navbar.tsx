import { Search } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

export function Navbar() {
  const { isAuthenticated } = useAuthStore();

  const handleSearchClick = () => {
    document.dispatchEvent(new Event("toggle-command-palette"));
  };

  // Detect OS for keyboard shortcut display
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b px-4 sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="-ml-1 flex-shrink-0" />
        <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />
        <div className="hidden sm:block truncate">
          <BreadcrumbNav items={[]} />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {isAuthenticated && (
          <Button
            variant="outline"
            className="relative h-9 w-9 p-0 sm:w-40 md:w-40 lg:w-64 sm:justify-start sm:px-3 sm:pr-12"
            onClick={handleSearchClick}
          >
            <Search className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline truncate">Search...</span>
            <KbdGroup>
              <Kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">{isMac ? "⌘ K" : "Ctrl K"}</span>
              </Kbd>
            </KbdGroup>
          </Button>
        )}
      </div>
    </header>
  );
}
