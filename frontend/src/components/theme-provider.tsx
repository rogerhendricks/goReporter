import { createContext, useContext, useEffect, useState } from "react"
import { useAuthStore } from "@/stores/authStore"

type Theme = "dark" | "light" | "system" | "medical-blue" | "high-contrast"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const { user, updateTheme, isAuthenticated } = useAuthStore()
  
  const [theme, setThemeState] = useState<Theme>(() => {
    // If user is authenticated and has a theme preference, use it
    if (user?.themePreference) {
      return user.themePreference
    }
    // Otherwise check localStorage
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme
  })

  // Apply user's theme preference when they log in
  useEffect(() => {
    if (isAuthenticated && user?.themePreference && user.themePreference !== theme) {
      setThemeState(user.themePreference)
    }
  }, [isAuthenticated, user?.themePreference])

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark", "medical-blue", "high-contrast")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)

      // Listen for OS theme changes in real-time
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove("light", "dark", "medical-blue", "high-contrast")
        root.classList.add(e.matches ? "dark" : "light")
      }

      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setThemeState(newTheme)
      
      // If user is authenticated, save theme preference to backend
      if (isAuthenticated) {
        updateTheme(newTheme).catch(err => {
          console.error('Failed to save theme preference:', err)
        })
      }
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}