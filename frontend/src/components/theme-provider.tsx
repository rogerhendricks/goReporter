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
    // Start with localStorage or default theme
    // User preference will be applied via useEffect when auth initializes
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme
  })

  // Apply user's theme preference when authenticated and user data is loaded
  useEffect(() => {
    console.log('Theme sync effect triggered:', { isAuthenticated, userTheme: user?.themePreference, currentTheme: theme })
    if (isAuthenticated && user?.themePreference) {
      // Always apply user's saved preference from backend
      console.log('Applying user theme preference:', user.themePreference)
      setThemeState(user.themePreference as Theme)
      localStorage.setItem(storageKey, user.themePreference)
    }
  }, [isAuthenticated, user?.themePreference, storageKey])

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
      console.log('setTheme called:', { newTheme, isAuthenticated, userId: user?.ID })
      localStorage.setItem(storageKey, newTheme)
      setThemeState(newTheme)
      
      // If user is authenticated, save theme preference to backend
      if (isAuthenticated) {
        console.log('Saving theme to backend...')
        updateTheme(newTheme).then(() => {
          console.log('Theme saved to backend successfully')
        }).catch(err => {
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