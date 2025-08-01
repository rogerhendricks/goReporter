package main

import (
    // "fmt"
    
    "log"
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/limiter"
    "github.com/rogerhendricks/goReporter/internal/router"
    "github.com/rogerhendricks/goReporter/internal/config"
    "github.com/rogerhendricks/goReporter/internal/models"
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

    // Load config from .env file for port address
    // cfg := config.LoadConfig()

    // Initialize the database connection
    config.ConnectDatabase()

    // Migrate the models
    err := config.DB.AutoMigrate(
        &models.User{}, &models.Token{}, &models.Patient{}, &models.Doctor{},
        &models.Address{}, &models.Report{}, &models.Device{}, &models.Lead{},
        &models.ImplantedDevice{}, &models.ImplantedLead{}, &models.Medication{},
        &models.PatientDoctor{}, &models.Report{}, &models.Arrhythmia{},
    )
    if err != nil {
        log.Fatalf("failed to migrate database: %v", err)
    }

    app := fiber.New()

    // Add security headers
    app.Use(helmet.New())

    // Configure CORS properly
    app.Use(cors.New(cors.Config{
        AllowOrigins:     "https://dev.nuttynarwhal.com, https://nuttynarwhal.com, http://localhost:3000,  http://localhost:8000",
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

    // Set up routes
    router.SetupRoutes(app)
    // fmt.Printf("%s●%s Server is listening on port %s\n", colorGreen, colorReset, cfg.Port)


    // Serve static files (React app) - this should come AFTER API routes
    handlers.SetupStaticRoutes(app)

        
    // Start the server
    app.Listen(":5000")
    // log.Fatal(app.Listen(":" + cfg.Port))
}