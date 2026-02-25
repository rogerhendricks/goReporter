import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, Suspense } from "react";
import { Toaster } from "sonner";
import { useAuthStore } from "./stores/authStore";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";
import { BreadcrumbProvider } from "@/components/ui/breadcrumb-context";
import { ThemeProvider } from "@/components/theme-provider";
import { useTheme } from "@/components/theme-provider";
import { routes } from "./router/routes";
import "./App.css";
import { fetchCSRFToken } from "./utils/axios";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { IdleMonitor} from "@/hooks/useIdleMonitor";


// Loading fallback component
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Preload critical routes after initial load
function preloadCriticalRoutes() {
  // Preload dashboards based on likely user roles
  const preloadModules = [
    import("@/pages/patients/PatientIndex"),
    import("@/pages/patients/PatientDetail"),
    import("@/pages/admin/AdminDashboard"),
    import("@/pages/DoctorDashboard"),
    import("@/pages/StaffDoctorDashboard"),
  ];

  // Fire and forget - these will be cached for instant navigation
  Promise.all(preloadModules).catch(() => {
    // Silently fail - not critical
  });
}

function AppContent() {
  const { initializeAuth, isInitialized, isAuthenticated } = useAuthStore();
  const { theme } = useTheme();

  useAdminNotifications();
  useUserNotifications();

  useEffect(() => {
    fetchCSRFToken();
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Preload critical routes after app initializes
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      // Small delay to not interfere with initial render
      const timer = setTimeout(preloadCriticalRoutes, 1000);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, isAuthenticated]);

  if (!isInitialized) {
    return <RouteLoader />;
  }

  return (
    <>
      <Toaster
        theme={theme === "system" ? undefined : (theme as "light" | "dark")}
        position="top-right"
        richColors
        closeButton
        expand={false}
        toastOptions={{
          classNames: {
            toast: "bg-card text-card-foreground border-border shadow-lg",
            title: "text-foreground font-semibold",
            description: "text-muted-foreground",
            actionButton:
              "bg-primary text-primary-foreground hover:bg-primary/90",
            cancelButton: "bg-muted text-muted-foreground hover:bg-muted/80",
            closeButton: "bg-card border-border hover:bg-muted",
            error:
              "bg-destructive text-destructive-foreground border-destructive",
            success: "bg-green-600 text-white border-green-600",
            warning: "bg-yellow-600 text-white border-yellow-600",
            info: "bg-blue-600 text-white border-blue-600",
          },
        }}
      />

      <Router>
        <BreadcrumbProvider>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              {routes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <LayoutWrapper layout={route.layout}>
                      {route.requiresAuth ? (
                        <ProtectedRoute roles={route.roles}>
                          {route.element}
                        </ProtectedRoute>
                      ) : (
                        route.element
                      )}
                    </LayoutWrapper>
                  }
                />
              ))}

              {/* Fallback route */}
              <Route
                path="*"
                element={
                  <LayoutWrapper layout="home">
                    <Navigate to={isAuthenticated ? "/" : "/login"} replace />
                  </LayoutWrapper>
                }
              />
            </Routes>
          </Suspense>
        </BreadcrumbProvider>
      </Router>
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <IdleMonitor />
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
