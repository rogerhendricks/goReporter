import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
    ChevronRight,
    LayoutDashboard,
    LogOut,
    Settings,
    Stethoscope,
    Users,
    CircuitBoard,
    Calendar,
    Check,
    BarChart3,
    Search,
    Eye,
    Sun,
    Moon,
    Monitor,
    Check as CheckIcon,
    User2,
} from "lucide-react"

import {
    Collapsible,
    CollapsibleContent,
} from "@/components/ui/collapsible"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/authStore"
import { useTheme } from "@/components/theme-provider"
import logoUrl from "@/assets/heart.svg"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { user, logout, hasAccess } = useAuthStore()
    const { theme, setTheme } = useTheme()
    const location = useLocation()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate("/login", { replace: true })
    }

    // Dashboard links (role-specific)
    const dashboardLinks = [
        {
            href: "/admin",
            label: "Admin Dashboard",
            icon: Settings,
            roles: ["admin"],
        },
        {
            href: "/doctor",
            label: "Doctor Dashboard",
            icon: Stethoscope,
            roles: ["doctor"],
        },
    ]

    // Organized navigation groups
    const navGroups = [
        {
            label: "Clinical",
            icon: Users,
            items: [
                {
                    href: "/patients",
                    label: "Patients",
                    icon: Users,
                    roles: ["admin", "doctor", "user", "viewer"],
                },
                {
                    href: "/search/patients",
                    label: "Patient Search",
                    icon: Search,
                    roles: ["admin", "doctor", "user", "viewer"],
                },
                {
                    href: "/doctors",
                    label: "Doctors",
                    icon: Stethoscope,
                    roles: ["admin", "doctor", "viewer", "user"],
                },
            ],
        },
        {
            label: "Devices",
            icon: CircuitBoard,
            items: [
                {
                    href: "/devices",
                    label: "Devices",
                    icon: CircuitBoard,
                    roles: ["admin"],
                },
                {
                    href: "/leads",
                    label: "Leads",
                    icon: CircuitBoard,
                    roles: ["admin"],
                },
            ],
        },
        {
            label: "Workflow",
            icon: Check,
            items: [
                {
                    href: "/appointments",
                    label: "Appointments",
                    icon: Calendar,
                    roles: ["admin", "doctor", "user", "viewer"],
                },
                {
                    href: "/tasks",
                    label: "Tasks",
                    icon: Check,
                    roles: ["admin", "doctor", "user", "viewer"],
                },
                {
                    href: "/productivity",
                    label: "Productivity",
                    icon: BarChart3,
                    roles: ["admin", "doctor", "user", "viewer"],
                },
            ],
        },
        {
            label: "Resources",
            icon: Eye,
            items: [
                {
                    href: "/knowledge-base",
                    label: "Knowledge Base",
                    icon: Eye,
                    roles: ["admin", "doctor", "user", "viewer"],
                },
            ],
        },
    ]

    const primaryDashboard = dashboardLinks.find(
        (link) => !link.roles || hasAccess(link.roles)
    )

    const visibleNavGroups = navGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => !item.roles || hasAccess(item.roles)),
        }))
        .filter((group) => group.items.length > 0)

    const displayName = user?.username || "Account"

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg  text-sidebar-primary-foreground">
                                    <img src={logoUrl} alt="Logo" className="size-6" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold text-primary">PMS Fusion</span>
                                    <span className="truncate text-xs text-muted-foreground">Internal Dashboard</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
                    <SidebarMenu>
                        {primaryDashboard && (
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={location.pathname === primaryDashboard.href}
                                    tooltip="Dashboard"
                                >
                                    <Link to={primaryDashboard.href}>
                                        <LayoutDashboard />
                                        <span>Dashboard</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}

                        {visibleNavGroups.map((group) => (
                            <Collapsible
                                key={group.label}
                                asChild
                                defaultOpen={group.items.some((item) =>
                                    location.pathname.startsWith(item.href)
                                )}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <SidebarMenuButton tooltip={group.label}>
                                                <group.icon />
                                                <span>{group.label}</span>
                                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                            </SidebarMenuButton>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            side="right"
                                            align="start"
                                            className="w-48 ml-1"
                                        >
                                            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {group.items.map((item) => (
                                                <DropdownMenuItem key={item.href} asChild>
                                                    <Link to={item.href} className="flex items-center gap-2">
                                                        <item.icon className="h-4 w-4" />
                                                        <span>{item.label}</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {group.items.map((item) => (
                                                <SidebarMenuSubItem key={item.href}>
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={location.pathname.startsWith(item.href)}
                                                    >
                                                        <Link to={item.href}>
                                                            <item.icon className="h-4 w-4" />
                                                            <span>{item.label}</span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <User2 className="h-4 w-4" />
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{displayName}</span>
                                        <span className="truncate text-xs opacity-60 text-muted-foreground">{user?.email}</span>
                                    </div>
                                    <ChevronRight className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side="bottom"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">{displayName}</span>
                                            <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setTheme("light")}>
                                    <Sun className="mr-2 h-4 w-4" />
                                    <span>Light</span>
                                    {theme === "light" && <CheckIcon className="ml-auto h-4 w-4" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme("dark")}>
                                    <Moon className="mr-2 h-4 w-4" />
                                    <span>Dark</span>
                                    {theme === "dark" && <CheckIcon className="ml-auto h-4 w-4" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme("medical-blue")}>
                                    <Stethoscope className="mr-2 h-4 w-4" />
                                    <span>Medical Blue</span>
                                    {theme === "medical-blue" && <CheckIcon className="ml-auto h-4 w-4" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme("system")}>
                                    <Monitor className="mr-2 h-4 w-4" />
                                    <span>System</span>
                                    {theme === "system" && <CheckIcon className="ml-auto h-4 w-4" />}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
