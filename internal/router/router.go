package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/handlers"
	"github.com/rogerhendricks/goReporter/internal/middleware"
)

func SetupRoutes(app *fiber.App) {
	// Auth routes
	auth := app.Group("/api/auth")
	auth.Post("/login", handlers.Login)
	auth.Post("/register", handlers.Register)
	auth.Post("/logout", middleware.AuthenticateJWT, handlers.Logout)
    auth.Post("/refresh-token", handlers.RefreshToken) 
	auth.Get("/me", middleware.AuthenticateJWT, handlers.GetMe)

	// Admin routes
	app.Use(middleware.AuthenticateJWT)
	
	// app.Get("/api/admin", handlers.GetAdminData)

	// User routes
	// app.Get("/api/users", handlers.GetUsers)
	app.Get("/api/users/:id", handlers.GetUserProfile)
	app.Put("/api/users/:id", handlers.UpdateUserProfile)
	app.Delete("/api/users/:id", handlers.DeleteUser)
	app.Post("/api/users", handlers.CreateUser)

	// Device routes
	app.Get("/api/devices/all", handlers.GetDevicesBasic)
	app.Get("/api/devices/search", handlers.SearchDevices)
	app.Get("/api/devices", handlers.GetDevices)
	app.Post("/api/devices", handlers.CreateDevice)
	app.Get("/api/devices/:id", handlers.GetDevice)
	app.Put("/api/devices/:id", handlers.UpdateDevice)
	app.Delete("/api/devices/:id", handlers.DeleteDevice)

	// Doctor routes
	app.Get("/api/doctors/all", handlers.GetDoctors)
	app.Get("/api/doctors", handlers.GetDoctorsBasic)
	app.Get("/api/doctors/search", handlers.SearchDoctors)
	app.Post("/api/doctors", handlers.CreateDoctor)
	app.Get("/api/doctors/:id", handlers.GetDoctor)
	app.Put("/api/doctors/:id", handlers.UpdateDoctor)
	app.Delete("/api/doctors/:id", handlers.DeleteDoctor)

	// Patient routes
	app.Get("/api/patients/all", handlers.GetAllPatients)
	app.Get("/api/patients", handlers.GetPatients)
	app.Post("/api/patients", handlers.CreatePatient)
	app.Get("/api/patients/:id", handlers.GetPatient)
	app.Put("/api/patients/:id", handlers.UpdatePatient)
	app.Delete("/api/patients/:id", handlers.DeletePatient)

	// Lead routes
	app.Get("/api/leads/all", handlers.GetleadsBasic)
	app.Get("/api/leads/search", handlers.SearchLeads)
	app.Get("/api/leads/:id", handlers.GetLead)
	app.Post("/api/leads", handlers.CreateLead)
	app.Put("/api/leads/:id", handlers.UpdateLead)
	app.Delete("/api/leads/:id", handlers.DeleteLead)

	// Medication routes
	app.Get("/api/medications", handlers.GetMedications)
	app.Post("/api/medications", handlers.CreateMedication)
	app.Put("/api/medications/:id", handlers.UpdateMedication)
	app.Delete("/api/medications/:id", handlers.DeleteMedication)

	// Report routes
	// app.Get("/api/reports", handlers.GetReports)
	// app.Post("/api/reports", handlers.CreateReport)

	// File routes
	app.Get("/api/files/*", middleware.AuthenticateJWT, handlers.ServeFile)
}