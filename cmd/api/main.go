package main

import (
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/rogerhendricks/goReporter/internal/bootstrap"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/handlers"
	"github.com/rogerhendricks/goReporter/internal/middleware"
	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/rogerhendricks/goReporter/internal/router"
	"github.com/rogerhendricks/goReporter/internal/security"
	"github.com/rogerhendricks/goReporter/internal/services"
)

func main() {
	defer func() {
		if r := recover(); r != nil {
			log.Fatalf("Application panicked: %v", r)
		}
		security.Close()
		config.CloseDatabase()
	}()

	// Optional: reset SQLite DB file on startup if requested
	// DB_RESET=file -> remove reporter.db before connecting
	if os.Getenv("DB_RESET") == "file" {
		if err := os.Remove("reporter.db"); err == nil {
			log.Println("SQLite database file removed for reset.")
		}
	}

	// Load config from .env file for port address
	cfg := config.LoadConfig()
	log.Printf("Config loaded - Port: %s", cfg.Port)

	// Initialize the database connection
	config.ConnectDatabase()

	// Run migrations and seeding
	if err := bootstrap.MigrateAndSeed(); err != nil {
		log.Fatalf("Database migration/seed failed: %v", err)
	}

	// Setup token cleanup background job
	bootstrap.SetupTokenCleanup()
	log.Println("Token cleanup scheduler initialized.")

	// Initialize security logger
	if err := security.InitSecurityLogger(); err != nil {
		log.Fatalf("Failed to initialize security logger: %v", err)
	}
	log.Println("Security logger initialized.")

	// Initialize webhook service
	handlers.InitWebhookService(config.DB)
	log.Println("Webhook service initialized.")

	// Start background tasks after DB + services are ready
	go startBackgroundTasks()
	go startTemporaryAccessTasks()

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		Prefork: false,
		AppName: "GoReporter",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})
	log.Println("Fiber app initialized.")

	log.Println("Setting up middleware (CORS, Logger, Limiter)...")

	// Add security headers
	app.Use(helmet.New(helmet.Config{
		XSSProtection:         "1; mode=block",
		ContentTypeNosniff:    "nosniff",
		XFrameOptions:         "DENY",
		ReferrerPolicy:        "no-referrer",
		ContentSecurityPolicy: "default-src 'self'",
	}))

	// Configure CORS properly
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "https://dev.nuttynarwhal.com, https://dev-mini.nuttynarwhal.com, https://nuttynarwhal.com, https://fiber.nuttynarwhal.com, http://localhost:3000, http://localhost:8000",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization, X-CSRF-Token",
		AllowCredentials: true,
	}))

	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} ${latency}\n",
	}))

	// Set up middleware (if any)
	app.Use(limiter.New(limiter.Config{
		Max:        500, // Increased from 100 to handle multiple parallel requests
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
	}))

	// Add custom CSRF protection
	app.Use(middleware.ValidateCSRF)

	// Security logging middleware
	// app.Use(middleware.SecurityLoggerMiddleware)
	// log.Println("Security logging middleware added.")
	log.Println("Middleware setup complete.")

	// Set up routes
	log.Println("Setting up API routes...")
	router.SetupRoutes(app, config.DB)
	log.Println("API routes setup complete.")
	// fmt.Printf("%s●%s Server is listening on port %s\n", colorGreen, colorReset, cfg.Port)

	// Serve static files (React app) - this should come AFTER API routes
	log.Println("Setting up static file routes...")
	handlers.SetupStaticRoutes(app)
	log.Println("Static file routes setup complete.")

	log.Println("Starting server on port 5000...")
	if err := app.Listen(":5000"); err != nil {
		log.Fatalf("Fiber server failed to start: %v", err)
	}
}

func startBackgroundTasks() {
	ticker := time.NewTicker(24 * time.Hour) // Check daily
	defer ticker.Stop()

	for range ticker.C {
		if err := models.CheckExpiredConsents(); err != nil {
			log.Printf("Error checking expired consents: %v", err)
		} else {
			log.Println("Successfully checked and updated expired consents")
		}
	}
}

func startTemporaryAccessTasks() {
	monitor := services.NewTemporaryAccessMonitor()
	monitor.Start()
}
