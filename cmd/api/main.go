package main

import (
    // "fmt"
    "os"
    "log"
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/limiter"
    "github.com/rogerhendricks/goReporter/internal/router"
    "github.com/rogerhendricks/goReporter/internal/config"
    "github.com/rogerhendricks/goReporter/internal/bootstrap"
    // "github.com/rogerhendricks/goReporter/internal/models"
    "github.com/rogerhendricks/goReporter/internal/handlers"
    "time"
    "github.com/gofiber/fiber/v2/middleware/helmet"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
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

    // // Migrate the models
    // err := config.DB.AutoMigrate(
    //     &models.User{}, &models.Token{}, &models.Patient{}, &models.Doctor{},
    //     &models.Address{}, &models.Report{}, &models.Device{}, &models.Lead{},
    //     &models.ImplantedDevice{}, &models.ImplantedLead{}, &models.Medication{},
    //     &models.PatientDoctor{}, &models.Arrhythmia{},
    // )
    // if err != nil {
    //     log.Fatalf("failed to migrate database: %v", err)
    // }
    // log.Println("Database migration completed successfully.")

    app := fiber.New(fiber.Config{
        Prefork: false,
        AppName: "GoReporter",
    })
    log.Println("Fiber app initialized.")

    log.Println("Setting up middleware (CORS, Logger, Limiter)...")
    // Add security headers
    app.Use(helmet.New())

    // Configure CORS properly
    app.Use(cors.New(cors.Config{
        AllowOrigins:     "https://dev.nuttynarwhal.com, https://dev-mini.nuttynarwhal.com, https://nuttynarwhal.com, http://localhost:3000,  http://localhost:8000",
        AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
        AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
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
    log.Println("Middleware setup complete.")
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