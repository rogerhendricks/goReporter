package router

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/websocket/v2"
	"github.com/rogerhendricks/goReporter/internal/handlers"
	"github.com/rogerhendricks/goReporter/internal/middleware"
	"github.com/rogerhendricks/goReporter/internal/security"
	"gorm.io/gorm"
)

var authLimiter = limiter.New(limiter.Config{
	Max:        50, // Allow 50 attempts per IP (protects against brute force across multiple accounts)
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

func SetupRoutes(app *fiber.App, db *gorm.DB) {
	app.Get("/api/csrf-token", handlers.GetCSRFToken)
	// Auth routes
	auth := app.Group("/api/auth")
	auth.Post("/login", authLimiter, handlers.Login)
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
	app.Get("/api/admin/appointments", middleware.RequireAdmin, handlers.GetAdminAppointments)
	app.Post("/api/admin/appointments/missed-letter", middleware.RequireAdmin, handlers.MarkMissedLettersSent)

	// WebSocket upgrade needs special handling - check auth in the filter
	app.Get("/api/admin/notifications/ws", websocket.New(handlers.AdminNotificationsWS, websocket.Config{
		Filter: func(c *fiber.Ctx) bool {
			fmt.Println("[WebSocket] Checking auth for admin notifications WS")

			// Check if user_role was set by the AuthenticateJWT middleware
			userRole := c.Locals("user_role")
			if userRole == nil {
				fmt.Println("[WebSocket] No user_role in locals, denying upgrade")
				return false
			}

			role, ok := userRole.(string)
			if !ok || role != "admin" {
				fmt.Printf("[WebSocket] User role is %v (not admin), denying upgrade\n", userRole)
				return false
			}

			fmt.Println("[WebSocket] User is admin, allowing upgrade")
			return true
		},
	}))

	// User notifications websocket (any authenticated user)
	app.Get("/api/notifications/ws", websocket.New(handlers.UserNotificationsWS, websocket.Config{
		Filter: func(c *fiber.Ctx) bool {
			userRole := c.Locals("user_role")
			if userRole == nil {
				return false
			}
			role, ok := userRole.(string)
			if !ok || role == "" {
				return false
			}
			return true
		},
	}))

	// User routes
	// app.Get("/api/users", handlers.GetUsers)
	app.Get("/api/users", middleware.RequireAdmin, handlers.GetUsers)
	app.Put("/api/users/theme", handlers.UpdateUserTheme) // Must be before /:id routes
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
	app.Get("/api/patients/overdue", middleware.SetUserRole, handlers.GetOverduePatients)
	app.Get("/api/patients/search", middleware.SetUserRole, handlers.SearchPatients)
	app.Post("/api/patients", middleware.RequireAdminOrUser, handlers.CreatePatient)
	app.Get("/api/patients/:id", middleware.AuthorizeDoctorPatientAccess, handlers.GetPatient)
	app.Put("/api/patients/:id", middleware.RequireAdminOrUser, handlers.UpdatePatient)
	app.Delete("/api/patients/:id", middleware.RequireAdminOrUser, handlers.DeletePatient)

	// Access request workflow (doctors request; admins approve/deny)
	app.Get("/api/access-requests/patient-lookup", middleware.RequireRole("doctor"), handlers.LookupPatientForAccessRequest)
	app.Post("/api/access-requests", middleware.RequireRole("doctor"), handlers.CreateAccessRequest)
	app.Get("/api/access-requests/mine", middleware.RequireRole("doctor"), handlers.GetMyAccessRequests)
	app.Get("/api/access-requests/:id", middleware.RequireRole("doctor", "admin"), handlers.GetAccessRequest)

	app.Get("/api/admin/access-requests", middleware.RequireAdmin, handlers.AdminListAccessRequests)
	app.Get("/api/admin/access-requests/:id", middleware.RequireAdmin, handlers.AdminGetAccessRequest)
	app.Put("/api/admin/access-requests/:id/approve", middleware.RequireAdmin, handlers.AdminApproveAccessRequest)
	app.Put("/api/admin/access-requests/:id/deny", middleware.RequireAdmin, handlers.AdminDenyAccessRequest)

	// Patient Notes routes
	app.Get("/api/patients/:id/notes", middleware.AuthorizeDoctorPatientAccess, handlers.GetPatientNotes)
	app.Post("/api/patients/:id/notes", middleware.RequireAdminUserOrStaffDoctor, handlers.CreatePatientNote)
	app.Put("/api/patients/:id/notes/:noteId", middleware.RequireAdminUserOrStaffDoctor, handlers.UpdatePatientNote)
	app.Delete("/api/patients/:id/notes/:noteId", middleware.RequireAdminUserOrStaffDoctor, handlers.DeletePatientNote)

	// Timeline routes
	app.Get("/api/patients/:patientId/timeline", middleware.AuthorizeDoctorPatientAccess, handlers.GetPatientTimeline)
	app.Get("/api/patients/:patientId/timeline/stats", middleware.AuthorizeDoctorPatientAccess, handlers.GetPatientTimelineStats)

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
	app.Get("/api/reports/recent", middleware.SetUserRole, handlers.GetRecentReports)
	app.Get("/api/patients/:patientId/reports", middleware.AuthorizeDoctorPatientAccess, handlers.GetReportsByPatient)
	app.Get("/api/reports/:id", handlers.GetReport)
	app.Put("/api/reports/:id", middleware.RequireAdminUserOrStaffDoctor, handlers.UploadFile, handlers.UpdateReport)
	app.Delete("/api/reports/:id", middleware.RequireAdminOrUser, handlers.DeleteReport)

	// Report Builder routes
	reportBuilder := handlers.NewReportBuilderHandler(db)
	app.Get("/api/report-builder/fields", reportBuilder.GetAvailableFields)
	app.Post("/api/report-builder/execute", reportBuilder.ExecuteReport)
	app.Post("/api/report-builder/reports", reportBuilder.SaveReport)
	app.Get("/api/report-builder/reports", reportBuilder.GetSavedReports)
	app.Get("/api/report-builder/reports/:id", reportBuilder.GetReportById)
	app.Put("/api/report-builder/reports/:id", reportBuilder.UpdateReport)
	app.Delete("/api/report-builder/reports/:id", reportBuilder.DeleteReport)
	app.Post("/api/report-builder/export/csv", reportBuilder.ExportToCSV)
	app.Post("/api/report-builder/export/excel", reportBuilder.ExportToExcel)
	app.Post("/api/report-builder/export/pdf", reportBuilder.ExportToPDF)

	// Search routes
	app.Get("/api/search/patients", middleware.SetUserRole, handlers.SearchPatientsComplex)
	app.Get("/api/search/global", middleware.SetUserRole, handlers.GlobalSearch)

	// File routes
	app.Get("/api/files/*", handlers.ServeFile)

	// Analytics routes
	app.Get("/api/analytics/summary", handlers.GetAnalyticsSummary)
	app.Get("/api/analytics/reports-summary", handlers.GetReportSummary)

	// Billing Code routes
	app.Get("/api/billing-codes", middleware.RequireAdmin, handlers.GetBillingCodes)
	app.Put("/api/billing-codes/:category", middleware.RequireAdmin, handlers.UpdateBillingCode)
	app.Get("/api/billing-codes/export", middleware.RequireAdmin, handlers.ExportBillingCodesCSV)

	// Tag routes
	tags := app.Group("/api/tags")
	tags.Get("/", handlers.GetAllTags)
	tags.Get("/stats", handlers.GetPatientTagStats)
	tags.Get("/report-stats", handlers.GetReportTagStats)
	tags.Post("/", middleware.RequireAdminOrUser, handlers.CreateTag)
	tags.Put("/:id", middleware.RequireAdminOrUser, handlers.UpdateTag)
	tags.Delete("/:id", middleware.RequireAdminOrUser, handlers.DeleteTag)

	// Task routes
	app.Get("/api/tasks", middleware.SetUserRole, handlers.GetTasks)
	app.Post("/api/tasks", middleware.RequireAdminUserDoctorOrStaffDoctor, handlers.CreateTask)
	app.Get("/api/tasks/:id", middleware.RequireAdminUserDoctorOrStaffDoctor, handlers.GetTask)
	app.Put("/api/tasks/:id", middleware.RequireAdminUserDoctorOrStaffDoctor, handlers.UpdateTask)
	app.Delete("/api/tasks/:id", middleware.RequireAdminUserDoctorOrStaffDoctor, handlers.DeleteTask)
	app.Post("/api/tasks/:id/notes", middleware.RequireAdminUserDoctorOrStaffDoctor, handlers.AddTaskNote)
	app.Put("/api/tasks/:id/notes/:noteId", middleware.RequireAdminUserDoctorOrStaffDoctor, handlers.UpdateTaskNote)
	app.Delete("/api/tasks/:id/notes/:noteId", middleware.RequireAdminUserDoctorOrStaffDoctor, handlers.DeleteTaskNote)

	// Patient-specific tasks
	app.Get("/api/patients/:patientId/tasks", middleware.AuthorizeDoctorPatientAccess, handlers.GetTasksByPatient)

	// Appointment routes
	app.Get("/api/appointments", handlers.GetAppointments)
	app.Get("/api/appointments/slots/available", handlers.GetAvailableSlots)
	app.Get("/api/appointments/:id", handlers.GetAppointment)
	app.Post("/api/appointments", middleware.RequireAdminOrUser, handlers.CreateAppointment)
	app.Put("/api/appointments/:id", middleware.RequireAdminOrUser, handlers.UpdateAppointment)
	app.Delete("/api/appointments/:id", middleware.RequireAdminOrUser, handlers.DeleteAppointment)
	app.Get("/api/patients/:patientId/appointments", middleware.AuthorizeDoctorPatientAccess, handlers.GetPatientAppointments)

	// Task template routes (if you want to add them)
	app.Get("/api/task-templates", middleware.RequireAdminUserDoctorOrStaffDoctor, handlers.GetTaskTemplates)
	app.Post("/api/task-templates", middleware.RequireAdmin, handlers.CreateTaskTemplate)
	app.Put("/api/task-templates/:id", middleware.RequireAdmin, handlers.UpdateTaskTemplate)
	app.Delete("/api/task-templates/:id", middleware.RequireAdmin, handlers.DeleteTaskTemplate)
	app.Post("/api/task-templates/:id/assign", middleware.RequireAdminUserDoctorOrStaffDoctor, handlers.AssignTemplateToPatient)
	app.Get("/api/task-templates/:id/patients", middleware.RequireAdminUserDoctorOrStaffDoctor, handlers.GetPatientsWithTemplate)

	// Patient consent routes
	app.Get("/api/patients/:patientId/consents", middleware.AuthorizeDoctorPatientAccess, handlers.GetPatientConsents)
	app.Get("/api/patients/:patientId/consents/active", middleware.AuthorizeDoctorPatientAccess, handlers.GetActiveConsents)
	app.Post("/api/patients/:patientId/consents", middleware.AuthorizeDoctorPatientAccess, handlers.CreateConsent)
	app.Put("/api/consents/:id", handlers.UpdateConsent)
	app.Post("/api/consents/:id/reaccept-terms", handlers.ReacceptTerms)
	app.Post("/api/consents/:id/revoke", handlers.RevokeConsent)
	app.Get("/api/patients/:patientId/consents/check", middleware.AuthorizeDoctorPatientAccess, handlers.CheckConsentStatus)
	app.Delete("/api/consents/:id", handlers.DeleteConsent)

	// Admin consent management
	app.Get("/api/admin/consents/stats", middleware.RequireAdmin, handlers.GetConsentStats)
	app.Get("/api/admin/consents/range", middleware.RequireAdmin, handlers.GetConsentsByDateRange)

	searchGroup := app.Group("/api/search")
	searchGroup.Get("/filters", middleware.SetUserRole, handlers.GetSavedSearchFilters)
	searchGroup.Post("/filters", middleware.SetUserRole, handlers.SaveSearchFilter)
	searchGroup.Delete("/filters/:id", middleware.SetUserRole, handlers.DeleteSavedSearchFilter)
	searchGroup.Get("/history", middleware.SetUserRole, handlers.GetSearchHistory)
	searchGroup.Get("/suggestions", middleware.SetUserRole, handlers.GetSearchSuggestions)

	// Webhook routes
	app.Get("/api/webhooks", middleware.RequireAdmin, handlers.GetWebhooks)
	app.Get("/api/webhooks/:id", middleware.RequireAdmin, handlers.GetWebhook)
	app.Post("/api/webhooks", middleware.RequireAdmin, handlers.CreateWebhook)
	app.Put("/api/webhooks/:id", middleware.RequireAdmin, handlers.UpdateWebhook)
	app.Delete("/api/webhooks/:id", middleware.RequireAdmin, handlers.DeleteWebhook)
	app.Post("/api/webhooks/:id/test", middleware.RequireAdmin, handlers.TestWebhook)
	app.Get("/api/webhooks/:id/deliveries", middleware.RequireAdmin, handlers.GetWebhookDeliveries)

	// Debug endpoint to preview Epic FHIR payload
	app.Get("/api/reports/:reportId/epic-preview", middleware.RequireAdminOrUser, handlers.PreviewEpicFHIR)

	// Productivity report routes
	app.Get("/api/productivity/my-report", middleware.RequireAdminOrUser, handlers.GetMyProductivityReport)
	app.Get("/api/productivity/team-report", middleware.RequireAdminOrUser, handlers.GetTeamProductivityReport)
	app.Get("/api/productivity/users/:userId/report", middleware.RequireAdmin, handlers.GetUserProductivityReport)

	// Team management routes
	app.Get("/api/teams", middleware.RequireAdmin, handlers.GetAllTeams)
	app.Get("/api/teams/:id", middleware.RequireAdmin, handlers.GetTeam)
	app.Post("/api/teams", middleware.RequireAdmin, handlers.CreateTeam)
	app.Put("/api/teams/:id", middleware.RequireAdmin, handlers.UpdateTeam)
	app.Delete("/api/teams/:id", middleware.RequireAdmin, handlers.DeleteTeam)
	app.Post("/api/teams/:id/members", middleware.RequireAdmin, handlers.AddTeamMembers)
	app.Delete("/api/teams/:id/members", middleware.RequireAdmin, handlers.RemoveTeamMembers)

	// Team productivity routes
	app.Get("/api/productivity/teams/:id", middleware.RequireAdmin, handlers.GetSpecificTeamProductivityReport)
	app.Get("/api/productivity/teams", middleware.RequireAdmin, handlers.GetAllTeamsProductivityReports)

}
