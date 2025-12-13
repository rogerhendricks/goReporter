package handlers

import (
    "net/http"
    "github.com/gofiber/fiber/v2"
    "time"
    "os"
    "path/filepath"
    "strings"
    "fmt"
    "log"
)

// UploadFile handles saving an uploaded file.
// It expects the patient ID to create a structured directory path.
func UploadFile(c *fiber.Ctx) error {
    const maxFileSize = 10 * 1024 * 1024 // 10 MB

    // Get patientId from form value to create a sub-directory
    
    patientID := c.FormValue("patientId")
    if patientID == "" {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Patient ID is required for file upload"})
    }

    // Get the file from the form
    file, err := c.FormFile("file")
    if err != nil {
        if err.Error() == "there is no uploaded file associated with the given key" {
            return c.Next() // Continue to the next handler without setting file paths.
        }
        // For any other error, it's a problem.
        log.Printf("Error retrieving file from form: %v", err)
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Failed to retrieve file"})
    }

    if file.Size > maxFileSize {
        return c.Status(413).JSON(fiber.Map{"error": "File too large"})
    }

    // Validate file type
    allowedTypes := map[string]bool{
        "application/pdf": true,
    }
    
    if !allowedTypes[file.Header.Get("Content-Type")] {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid file type"})
    }

    // Create a safe and unique filename
    // e.g., 1701388800-report.pdf
    uniqueFilename := fmt.Sprintf("%d-%s", time.Now().Unix(), filepath.Base(file.Filename))

    // Define the directory path: uploads/reports/{patientId}
    uploadDir := filepath.Join("uploads", "reports", patientID)
    if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
        log.Printf("Error creating upload directory: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create upload directory"})
    }

    // Define the full save path for the file
    savePath := filepath.Join(uploadDir, uniqueFilename)

    // Save the file to the server
    if err := c.SaveFile(file, savePath); err != nil {
        log.Printf("Error saving file: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save file"})
    }

    // The file path to be stored in the database (relative path)
    // On Windows, paths use '\', replace with '/' for URL consistency
    dbPath := strings.ReplaceAll(savePath, "\\", "/")

    // The URL the frontend will use to access the file
    fileURL := fmt.Sprintf("/files/%s", strings.TrimPrefix(dbPath, "uploads/"))

    // Store the paths in locals to be used by the next handler (CreateReport/UpdateReport)
    c.Locals("filePath", dbPath)
    c.Locals("fileUrl", fileURL)

    return c.Next()
}


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