# Theme Improvements Guide

Your current theme setup is good! Here are 10 powerful improvements:

## 1. ✨ Smooth Theme Transitions

Add smooth color transitions when switching themes:

```css
/* In src/index.css */
@layer base {
  * {
    @apply border-border outline-ring/50;
    transition-property: background-color, border-color, color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Benefits**: Eliminates jarring color flashes when switching themes

---

## 2. 🎨 Custom Color Schemes (Beyond Light/Dark)

Add branded color themes for your medical app:

```tsx
// src/components/theme-provider.tsx
type Theme = "dark" | "light" | "system" | "medical-blue" | "high-contrast"

// In your CSS, add:
.medical-blue {
  --primary: oklch(0.55 0.15 240); /* Medical blue */
  --accent: oklch(0.65 0.12 180); /* Teal accent */
  --card: oklch(0.98 0.01 240);
}

.high-contrast {
  --background: oklch(1 0 0);
  --foreground: oklch(0 0 0);
  --border: oklch(0 0 0);
  --primary: oklch(0 0 0);
  --destructive: oklch(0.4 0.3 20);
}
```

Update ModeToggle:
```tsx
<DropdownMenuItem onClick={() => setTheme("medical-blue")}>
  <Stethoscope className="mr-2 h-4 w-4" />
  Medical Blue
</DropdownMenuItem>
<DropdownMenuItem onClick={() => setTheme("high-contrast")}>
  <Eye className="mr-2 h-4 w-4" />
  High Contrast
</DropdownMenuItem>
```

---

## 3. 🌓 System Theme Sync with Live Updates

React to OS theme changes in real-time:

```tsx
// Enhanced theme-provider.tsx
export function ThemeProvider({ children, defaultTheme = "system", storageKey = "vite-ui-theme" }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark", "medical-blue", "high-contrast")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.add(systemTheme)

      // Listen for OS theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove("light", "dark")
        root.classList.add(e.matches ? "dark" : "light")
      }
      
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    root.classList.add(theme)
  }, [theme])

  // ... rest of component
}
```

---

## 4. 🎯 Accent Color Picker

Let admins customize the primary accent color:

```tsx
// src/components/admin/ThemeCustomizer.tsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export function ThemeCustomizer() {
  const [accentColor, setAccentColor] = useState('#3b82f6')

  const updateAccentColor = (color: string) => {
    setAccentColor(color)
    const root = document.documentElement
    // Convert hex to OKLCH (use a library like culori)
    root.style.setProperty('--primary', `oklch(0.55 0.15 ${color})`)
    localStorage.setItem('accent-color', color)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize Theme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="accent">Primary Accent Color</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="accent"
              type="color"
              value={accentColor}
              onChange={(e) => updateAccentColor(e.target.value)}
              className="w-20 h-10"
            />
            <Input
              value={accentColor}
              onChange={(e) => updateAccentColor(e.target.value)}
              placeholder="#3b82f6"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 5. 📊 Theme-Aware Charts

Ensure your charts adapt to theme changes:

```tsx
// src/components/charts/DonutChart.tsx
import { useTheme } from '@/components/theme-provider'

export function DonutChart() {
  const { theme } = useTheme()
  
  const chartColors = {
    light: {
      grid: '#e5e7eb',
      text: '#374151',
      tooltip: '#ffffff'
    },
    dark: {
      grid: '#374151',
      text: '#e5e7eb',
      tooltip: '#1f2937'
    }
  }
  
  const colors = theme === 'dark' ? chartColors.dark : chartColors.light
  
  // Use colors in your chart config
}
```

Or use CSS variables directly:
```tsx
const chartConfig = {
  grid: { color: 'hsl(var(--border))' },
  tooltip: { backgroundColor: 'hsl(var(--popover))' }
}
```

---

## 6. 🔔 Toast/Notification Theme Integration

Ensure Sonner toasts match your theme:

```tsx
// src/main.tsx or App.tsx
import { Toaster } from 'sonner'
import { useTheme } from '@/components/theme-provider'

function App() {
  const { theme } = useTheme()
  
  return (
    <>
      <Toaster 
        theme={theme === 'system' ? undefined : theme}
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: 'bg-card text-card-foreground border-border',
            title: 'text-foreground',
            description: 'text-muted-foreground',
            actionButton: 'bg-primary text-primary-foreground',
            cancelButton: 'bg-muted text-muted-foreground',
          },
        }}
      />
      {/* App content */}
    </>
  )
}
```

---

## 7. 🖼️ Image Brightness Adjustment

Dim images in dark mode for better UX:

```css
/* In src/index.css */
@layer utilities {
  .dark img:not(.no-filter) {
    filter: brightness(0.8) contrast(1.1);
  }
  
  .dark .logo-image {
    filter: brightness(0.9);
  }
}
```

Or use CSS variables:
```css
:root {
  --image-brightness: 1;
}

.dark {
  --image-brightness: 0.8;
}

img {
  filter: brightness(var(--image-brightness));
}
```

---

## 8. 💾 Theme Persistence per User

Save theme preference in user profile (backend):

```tsx
// src/stores/authStore.ts (add to your existing store)
interface User {
  // ... existing fields
  themePreference?: 'light' | 'dark' | 'system'
}

// When user logs in, apply their saved theme:
export const useAuthStore = create<AuthState>((set, get) => ({
  // ... existing state
  
  login: async (credentials) => {
    const response = await authService.login(credentials)
    const user = response.user
    
    // Apply user's theme preference
    if (user.themePreference) {
      const themeProvider = document.querySelector('[data-theme-provider]')
      if (themeProvider) {
        // Apply theme
      }
    }
    
    set({ user, isAuthenticated: true })
  }
}))
```

Backend endpoint:
```go
// internal/handlers/user.go
func UpdateUserTheme(c *fiber.Ctx) error {
    userID := c.Locals("userId").(uint)
    var req struct {
        Theme string `json:"theme"`
    }
    
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
    }
    
    config.DB.Model(&models.User{}).Where("id = ?", userID).
        Update("theme_preference", req.Theme)
    
    return c.JSON(fiber.Map{"message": "Theme updated"})
}
```

---

## 9. 🎭 Component-Specific Theming

Create theme variants for specific components:

```css
/* Medical-specific component themes */
.report-card {
  --card-bg: oklch(0.98 0.01 240);
  --card-border: oklch(0.85 0.02 240);
  background: var(--card-bg);
  border-color: var(--card-border);
}

.dark .report-card {
  --card-bg: oklch(0.22 0.01 240);
  --card-border: oklch(0.35 0.02 240);
}

.battery-critical {
  --status-bg: oklch(0.95 0.05 20);
  --status-text: oklch(0.4 0.15 20);
}

.dark .battery-critical {
  --status-bg: oklch(0.25 0.08 20);
  --status-text: oklch(0.85 0.12 20);
}
```

---

## 10. 🌈 Theme Preview Mode

Let users preview themes before applying:

```tsx
// src/components/admin/ThemePreview.tsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'

export function ThemePreview() {
  const { theme, setTheme } = useTheme()
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)

  const applyPreview = (themeToPreview: string) => {
    setPreviewTheme(themeToPreview)
    document.documentElement.classList.remove('light', 'dark', 'medical-blue')
    document.documentElement.classList.add(themeToPreview)
  }

  const confirmTheme = () => {
    if (previewTheme) {
      setTheme(previewTheme as any)
      setPreviewTheme(null)
    }
  }

  const cancelPreview = () => {
    setPreviewTheme(null)
    document.documentElement.classList.remove('light', 'dark', 'medical-blue')
    document.documentElement.classList.add(theme)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {['light', 'dark', 'medical-blue'].map((t) => (
          <Card 
            key={t}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => applyPreview(t)}
          >
            <CardHeader>
              <CardTitle className="text-sm capitalize">{t.replace('-', ' ')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-20 rounded border bg-card" />
            </CardContent>
          </Card>
        ))}
      </div>

      {previewTheme && (
        <div className="flex gap-2">
          <Button onClick={confirmTheme}>Apply Theme</Button>
          <Button variant="outline" onClick={cancelPreview}>Cancel</Button>
        </div>
      )}
    </div>
  )
}
```

---

## Quick Implementation Priority

**Phase 1 (Easy wins - 30 mins)**:
1. Add smooth transitions (copy CSS above)
2. Add system theme live updates (update theme-provider)
3. Theme-aware Toaster config

**Phase 2 (Enhanced UX - 2 hours)**:
4. High-contrast theme option
5. Image brightness in dark mode
6. Theme-aware charts

**Phase 3 (Advanced - 4 hours)**:
7. User theme persistence in backend
8. Medical blue branded theme
9. Admin theme customizer
10. Theme preview mode

---

## Testing Checklist

- [ ] Theme persists after page reload
- [ ] System theme changes update automatically
- [ ] All components readable in each theme
- [ ] Charts/graphs visible in dark mode
- [ ] Form inputs have proper contrast
- [ ] Buttons meet WCAG AA contrast ratio
- [ ] Toast notifications match theme
- [ ] Modal/dialog backgrounds opaque
- [ ] Focus indicators visible in all themes
- [ ] Loading skeletons match card backgrounds

---

## WCAG Accessibility

Ensure your custom themes meet contrast requirements:

```bash
# Install contrast checker
npm install --save-dev wcag-contrast

# Or use online tool:
# https://webaim.org/resources/contrastchecker/
```

Check these color pairs:
- `--foreground` vs `--background` → 7:1 (AAA)
- `--primary-foreground` vs `--primary` → 4.5:1 (AA)
- `--muted-foreground` vs `--background` → 4.5:1 (AA)

---

## Resources

- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [OKLCH Color Space](https://oklch.com/)
- [Tailwind Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
