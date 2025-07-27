package handlers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/filesystem"
    "net/http"
)

// SetupStaticRoutes serves the built React app
func SetupStaticRoutes(app *fiber.App) {
    // Serve static files from the built React app
    app.Use("/", filesystem.New(filesystem.Config{
        Root:         http.Dir("./frontend/dist"),
        Browse:       false,
        Index:        "index.html",
        NotFoundFile: "index.html", // SPA fallback for client-side routing
    }))
}