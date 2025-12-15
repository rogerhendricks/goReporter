package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/rogerhendricks/goReporter/internal/bootstrap"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/router"
	"github.com/rogerhendricks/goReporter/internal/security"

	// "github.com/rogerhendricks/goReporter/internal/models"
	"time"

	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/rogerhendricks/goReporter/internal/handlers"

	// "github.com/gofiber/fiber/v2/middleware/csrf"
	"github.com/rogerhendricks/goReporter/internal/middleware"
)

// const (
//     colorGreen = "\033[32m"
//     colorReset = "\033[0m"
// )

func main() {
    defer func() {
        if r := recover(); r != nil {
            log.Fatalf("Application panicked: %v", r)
        }
        security.Close()
    }()

    // Optional: reset SQLite DB file on startup if requested
    // DB_RESET=file -> remove [reporter.db](http://_vscodecontentref_/1) before connecting
    if os.Getenv("DB_RESET") == "file" {
        if err := os.Remove("reporter.db"); err == nil {
            log.Println("SQLite database file removed for reset.")
        }
    }

    // Load config from .env file for port address
    // cfg := config.LoadConfig()

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

    // Initialize Fiber app
    app := fiber.New(fiber.Config{
        Prefork: false,
        AppName: "GoReporter",
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
        Max:        100,
        Expiration: 1 * time.Minute,
        KeyGenerator: func(c *fiber.Ctx) string {
            return c.IP()
        },
    }))

        // Add custom CSRF protection
    app.Use(middleware.ValidateCSRF)

//     app.Use(csrf.New(csrf.Config{
//         KeyLookup:      "header:X-CSRF-Token",
//         CookieName:     "csrf_token",
//         CookieSameSite: "Lax",
//         Expiration:     1 * time.Hour,
//         KeyGenerator:   func() string {
//         // Use crypto/rand for token generation
//         b := make([]byte, 32)
//         rand.Read(b)
//         return fmt.Sprintf("%x", b)
//     },
//         Next: func(c *fiber.Ctx) bool {
//         // Skip CSRF protection for GET, HEAD, OPTIONS (safe methods)
//         // and the csrf-token endpoint
//         return c.Method() == "GET" || 
//                c.Method() == "HEAD" || 
//                c.Method() == "OPTIONS" ||
//                  c.Path() == "/api/auth/login" ||
//                c.Path() == "/api/auth/register" ||
//                c.Path() == "/api/auth/refresh-token"
//     },
// }))

    log.Println("Middleware setup complete.")

    // Security logging middleware
    app.Use(middleware.SecurityLoggerMiddleware)
    log.Println("Security logging middleware added.")

    // Set up routes
    log.Println("Setting up API routes...")
    router.SetupRoutes(app)
    log.Println("API routes setup complete.")
    // fmt.Printf("%s●%s Server is listening on port %s\n", colorGreen, colorReset, cfg.Port)
    
    
    // Serve static files (React app) - this should come AFTER API routes
    log.Println("Setting up static file routes...")
    handlers.SetupStaticRoutes(app)
    log.Println("Static file routes setup complete.")

    log.Println("Starting server on port 5000...")
    // Start the server
    // Start the server
    if err := app.Listen(":5000"); err != nil {
        log.Fatalf("Fiber server failed to start: %v", err)
    }
}