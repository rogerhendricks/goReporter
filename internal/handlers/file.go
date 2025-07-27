package handlers

import (
    "net/http"
    "github.com/gofiber/fiber/v2"
    // "github.com/gofiber/contrib/jwt"
    "os"
    "path/filepath"
    "strings"
)

// ServeFile serves a file securely from the uploads directory
func ServeFile(c *fiber.Ctx) error {
    filePath := c.Params("*")
    fullPath := filepath.Join("uploads", filePath)

    // Security check: ensure the path is within the uploads directory
    if !isPathSafe(fullPath) {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
    }

    // Check if file exists
    if _, err := os.Stat(fullPath); os.IsNotExist(err) {
        return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "File not found"})
    }

    // Set proper headers for PDF files
    c.Set("Content-Type", "application/pdf")
    c.Set("Content-Disposition", "inline")

    return c.SendFile(fullPath)
}

// isPathSafe checks if the requested file path is safe
func isPathSafe(filePath string) bool {
    // Improved path safety check
    cleanPath := filepath.Clean(filePath)
    uploadsDir := filepath.Clean("uploads")
    
    // Ensure the path is within uploads directory
    if !strings.HasPrefix(cleanPath, uploadsDir+string(filepath.Separator)) {
        return false
    }
    
    // Check for path traversal attempts
    if strings.Contains(cleanPath, "..") {
        return false
    }
    
    return true
}