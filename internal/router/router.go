package router

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/rogerhendricks/goReporter/internal/handlers"
	"github.com/rogerhendricks/goReporter/internal/middleware"
	"github.com/rogerhendricks/goReporter/internal/security"
)

var authLimiter = limiter.New(limiter.Config{
    Max:        50,  // Allow 50 attempts per IP (protects against brute force across multiple accounts)
    Expiration: 15 * time.Minute,
	    KeyGenerator: func(c *fiber.Ctx) string {
        // Use real IP for rate limiting
        return security.GetRealIP(c)
    },
    LimitReached: func(c *fiber.Ctx) error {
        return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
            "error": "Too many login attempts from this IP address. Please try again later.",
        })
    },
})


func SetupRoutes(app *fiber.App) {
	app.Get("/api/csrf-token", handlers.GetCSRFToken)
	// Auth routes
	auth := app.Group("/api/auth")
	auth.Post("/login",authLimiter, handlers.Login)
	auth.Post("/register", middleware.AuthenticateJWT, middleware.RequireAdmin, handlers.Register)
	auth.Post("/logout", middleware.AuthenticateJWT, handlers.Logout)
	auth.Post("/refresh-token", handlers.RefreshToken)
	auth.Get("/me", middleware.AuthenticateJWT, handlers.GetMe)

	app.Use(middleware.AuthenticateJWT)
	
	// Apply security logging AFTER authentication so user context is available
    app.Use(middleware.SecurityLoggerMiddleware)
	
	// Admin routes
	// app.Get("/api/admin", handlers.GetAdminData)
	app.Get("/api/admin/security-logs", middleware.RequireAdmin, handlers.GetSecurityLogs)
	app.Get("/api/admin/security-logs/export", middleware.RequireAdmin, handlers.ExportSecurityLogs)
	// User routes
	// app.Get("/api/users", handlers.GetUsers)
	app.Get("/api/users", middleware.RequireAdmin, handlers.GetUsers)
	app.Get("/api/users/:id", handlers.GetUserProfile)
	app.Put("/api/users/:id", handlers.UpdateUser)
	app.Delete("/api/users/:id", handlers.DeleteUser)
	app.Post("/api/users", handlers.CreateUser)

	// Device routes - admin only for CUD operations
	app.Get("/api/devices/all", handlers.GetDevicesBasic)
	app.Get("/api/devices/search", handlers.SearchDevices)
	app.Get("/api/devices", middleware.RequireAdmin, handlers.GetDevices)
	app.Post("/api/devices", middleware.RequireAdmin, handlers.CreateDevice)
	app.Get("/api/devices/:id", handlers.GetDevice)
	app.Put("/api/devices/:id", middleware.RequireAdmin, handlers.UpdateDevice)
	app.Delete("/api/devices/:id", middleware.RequireAdmin, handlers.DeleteDevice)

	// Doctor routes - admin only for CUD operations
	app.Get("/api/doctors/all", handlers.GetDoctors)
	app.Get("/api/doctors", handlers.GetDoctorsBasic)
	app.Get("/api/doctors/search", handlers.SearchDoctors)
	app.Post("/api/doctors", middleware.RequireAdmin, handlers.CreateDoctor)
	app.Get("/api/doctors/:id", handlers.GetDoctor)
	app.Put("/api/doctors/:id", middleware.RequireAdmin, handlers.UpdateDoctor)
	app.Delete("/api/doctors/:id", middleware.RequireAdmin, handlers.DeleteDoctor)

	// Patient routes - admin and doctor access with role-based filtering
	app.Get("/api/patients", middleware.SetUserRole, handlers.GetPatients)
	app.Get("/api/patients/all", middleware.SetUserRole, handlers.GetPatientsPaginated)
	app.Get("/api/patients/list", middleware.SetUserRole, handlers.GetAllPatients)
	app.Get("/api/patients/recent", middleware.SetUserRole, handlers.GetMostRecentPatientList)
	app.Get("/api/patients/search", middleware.SetUserRole, handlers.SearchPatients)
	app.Post("/api/patients", middleware.RequireAdminOrUser, handlers.CreatePatient)
	app.Get("/api/patients/:id", middleware.AuthorizeDoctorPatientAccess, handlers.GetPatient)
	app.Put("/api/patients/:id", middleware.RequireAdminOrUser, handlers.UpdatePatient)
	app.Delete("/api/patients/:id", middleware.RequireAdminOrUser, handlers.DeletePatient)

	// Lead routes - admin only for CUD operations
	app.Get("/api/leads/all", handlers.GetLeadsBasic)
	app.Get("/api/leads/search", handlers.SearchLeads)
	app.Get("/api/leads/:id", handlers.GetLead)
	app.Post("/api/leads", middleware.RequireAdmin, handlers.CreateLead)
	app.Put("/api/leads/:id", middleware.RequireAdmin, handlers.UpdateLead)
	app.Delete("/api/leads/:id", middleware.RequireAdmin, handlers.DeleteLead)

	// Medication routes
	app.Get("/api/medications", handlers.GetMedications)
	app.Post("/api/medications", handlers.CreateMedication)
	app.Put("/api/medications/:id", handlers.UpdateMedication)
	app.Delete("/api/medications/:id", handlers.DeleteMedication)

	// Report routes
	app.Post("/api/reports", handlers.UploadFile, handlers.CreateReport)
	app.Get("/api/reports/recent", middleware.AuthorizeDoctorPatientAccess, handlers.GetRecentReports)
	app.Get("/api/patients/:patientId/reports", middleware.AuthorizeDoctorPatientAccess, handlers.GetReportsByPatient)
	app.Get("/api/reports/:id", handlers.GetReport)
	app.Put("/api/reports/:id", middleware.RequireAdminOrUser, handlers.UploadFile, handlers.UpdateReport)
	app.Delete("/api/reports/:id", middleware.RequireAdminOrUser, handlers.DeleteReport)

	// Search routes
	app.Get("/api/search/patients", middleware.SetUserRole, handlers.SearchPatientsComplex)

	// File routes
	app.Get("/api/files/*", handlers.ServeFile)

	// Analytics routes
	app.Get("/api/analytics/summary", handlers.GetAnalyticsSummary)

	// Tag routes
	tags := app.Group("/api/tags")
	tags.Get("/", handlers.GetAllTags)
	tags.Post("/", middleware.RequireAdminOrUser, handlers.CreateTag)
	tags.Put("/:id", middleware.RequireAdminOrUser, handlers.UpdateTag)
	tags.Delete("/:id", middleware.RequireAdminOrUser, handlers.DeleteTag)

// Task routes
    app.Get("/api/tasks", middleware.RequireAdminOrUser, handlers.GetTasks)
    app.Post("/api/tasks", middleware.RequireAdminOrUser, handlers.CreateTask)
    app.Get("/api/tasks/:id", middleware.RequireAdminOrUser, handlers.GetTask)
    app.Put("/api/tasks/:id", middleware.RequireAdminOrUser, handlers.UpdateTask)
    app.Delete("/api/tasks/:id", middleware.RequireAdminOrUser, handlers.DeleteTask)
    app.Post("/api/tasks/:id/notes", middleware.RequireAdminOrUser, handlers.AddTaskNote)
	app.Put("/api/tasks/:id/notes/:noteId", middleware.RequireAdminOrUser, handlers.UpdateTaskNote)
	app.Delete("/api/tasks/:id/notes/:noteId", middleware.RequireAdminOrUser, handlers.DeleteTaskNote)
    
    // Patient-specific tasks
    app.Get("/api/patients/:patientId/tasks", middleware.RequireAdminOrUser, handlers.GetTasksByPatient)
    
    // Task template routes (if you want to add them)
    app.Get("/api/task-templates", middleware.RequireAdminOrUser, handlers.GetTaskTemplates)
    app.Post("/api/task-templates", middleware.RequireAdmin, handlers.CreateTaskTemplate)
    app.Put("/api/task-templates/:id", middleware.RequireAdmin, handlers.UpdateTaskTemplate)
    app.Delete("/api/task-templates/:id", middleware.RequireAdmin, handlers.DeleteTaskTemplate)
	app.Post("/api/task-templates/:id/assign", middleware.RequireAdminOrUser, handlers.AssignTemplateToPatient)
	app.Get("/api/task-templates/:id/patients", middleware.RequireAdminOrUser, handlers.GetPatientsWithTemplate)

	// Patient consent routes
    app.Get("/api/patients/:patientId/consents", middleware.AuthorizeDoctorPatientAccess, handlers.GetPatientConsents)
    app.Get("/api/patients/:patientId/consents/active", middleware.AuthorizeDoctorPatientAccess, handlers.GetActiveConsents)
    app.Post("/api/patients/:patientId/consents", middleware.RequireAdminOrUser, handlers.CreateConsent)
    app.Put("/api/consents/:id", middleware.RequireAdminOrUser, handlers.UpdateConsent)
    app.Post("/api/consents/:id/reaccept-terms", middleware.RequireAdminOrUser, handlers.ReacceptTerms)
    app.Post("/api/consents/:id/revoke", middleware.RequireAdminOrUser, handlers.RevokeConsent)
    app.Get("/api/patients/:patientId/consents/check", middleware.AuthorizeDoctorPatientAccess, handlers.CheckConsentStatus)
    app.Delete("/api/consents/:id", middleware.RequireAdmin, handlers.DeleteConsent)

    // Admin consent management
    app.Get("/api/admin/consents/stats", middleware.RequireAdmin, handlers.GetConsentStats)
    app.Get("/api/admin/consents/range", middleware.RequireAdmin, handlers.GetConsentsByDateRange)
}
