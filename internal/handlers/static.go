package handlers

import (
	"net/http"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
)

// SetupStaticRoutes serves the built React app
func SetupStaticRoutes(app *fiber.App) {
	// Add cache-busting headers for static assets (JS, CSS) but not for HTML
	app.Use(func(c *fiber.Ctx) error {
		path := c.Path()

		// Set cache headers for static assets (js, css files with hashes in name)
		if strings.HasSuffix(path, ".js") || strings.HasSuffix(path, ".css") {
			c.Set("Cache-Control", "public, max-age=31536000, immutable")
		} else if strings.HasSuffix(path, ".html") || path == "/" {
			// Don't cache HTML files to ensure users get updates
			c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
			c.Set("Pragma", "no-cache")
			c.Set("Expires", "0")
		}

		return c.Next()
	})

	// Serve static files from the built React app
	app.Use("/", filesystem.New(filesystem.Config{
		Root:         http.Dir("./frontend/dist"),
		Browse:       false,
		Index:        "index.html",
		NotFoundFile: "index.html", // SPA fallback for client-side routing
	}))
}
