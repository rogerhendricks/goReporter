package handlers

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rogerhendricks/goReporter/internal/models"
)

const (
	uploadRootDir            = "uploads"
	reportUploadSubdir       = "reports"
	pdfContentType           = "application/pdf"
	sniffBufferSize          = 512
	maxUploadSize      int64 = 10 * 1024 * 1024 // 10 MB
)

var (
	patientIDPattern = regexp.MustCompile(`^\d+$`)
	pdfMagicHeader   = []byte("%PDF-")
)

// UploadFile handles saving an uploaded file.
// It expects the patient ID to create a structured directory path.
func UploadFile(c *fiber.Ctx) error {
	patientID := strings.TrimSpace(c.FormValue("patientId"))
	if patientID == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Patient ID is required for file upload"})
	}
	if !patientIDPattern.MatchString(patientID) {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patient ID format"})
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		if err.Error() == "there is no uploaded file associated with the given key" {
			return c.Next()
		}
		log.Printf("Error retrieving file from form: %v", err)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Failed to retrieve file"})
	}

	if fileHeader.Size > maxUploadSize {
		return c.Status(http.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "File too large"})
	}

	uploadFile, err := fileHeader.Open()
	if err != nil {
		log.Printf("Error opening uploaded file: %v", err)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Failed to process uploaded file"})
	}
	defer uploadFile.Close()

	sniffBuffer := make([]byte, sniffBufferSize)
	n, readErr := uploadFile.Read(sniffBuffer)
	if readErr != nil && readErr != io.EOF {
		log.Printf("Error sniffing file content: %v", readErr)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Failed to inspect uploaded file"})
	}
	if n == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Uploaded file is empty"})
	}

	detectedType := http.DetectContentType(sniffBuffer[:n])
	if detectedType != pdfContentType || !bytes.HasPrefix(sniffBuffer[:n], pdfMagicHeader) {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Only valid PDF files are allowed"})
	}

	if _, err = uploadFile.Seek(0, io.SeekStart); err != nil {
		log.Printf("Error resetting uploaded file reader: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process uploaded file"})
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	switch ext {
	case ".pdf":
		// ok
	case "":
		ext = ".pdf"
	default:
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Only PDF files are allowed"})
	}

	uniqueFilename := uuid.NewString() + ext

	uploadDir := filepath.Join(uploadRootDir, reportUploadSubdir, patientID)
	if err := os.MkdirAll(uploadDir, 0o750); err != nil {
		log.Printf("Error creating upload directory: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create upload directory"})
	}

	tempFile, err := os.CreateTemp(uploadDir, "upload-*.pdf")
	if err != nil {
		log.Printf("Error creating temp file: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize file storage"})
	}
	removeTemp := true
	defer func() {
		tempFile.Close()
		if removeTemp {
			_ = os.Remove(tempFile.Name())
		}
	}()

	limitedReader := &io.LimitedReader{R: uploadFile, N: maxUploadSize + 1}
	if _, err := io.Copy(tempFile, limitedReader); err != nil {
		log.Printf("Error saving uploaded file: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save file"})
	}
	if limitedReader.N == 0 {
		return c.Status(http.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "File too large"})
	}

	if err := tempFile.Sync(); err != nil {
		log.Printf("Error syncing uploaded file: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to finalize file"})
	}

	if err := tempFile.Close(); err != nil {
		log.Printf("Error closing temp file: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to finalize file"})
	}

	savePath := filepath.Join(uploadDir, uniqueFilename)
	if err := os.Rename(tempFile.Name(), savePath); err != nil {
		log.Printf("Error moving temp file into place: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to finalize file"})
	}
	removeTemp = false

	dbPath := strings.ReplaceAll(savePath, "\\", "/")
	fileURL := fmt.Sprintf("/files/%s", strings.TrimPrefix(dbPath, uploadRootDir+"/"))

	c.Locals("filePath", dbPath)
	c.Locals("fileUrl", fileURL)

	return c.Next()
}

// ServeFile serves a file securely from the uploads directory
func ServeFile(c *fiber.Ctx) error {
	if c.Locals("userID") == nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Authentication required"})
	}

	filePath := c.Params("*")

	// IDOR Check: Verify user has access to the patient's files
	// We clean the path to resolve any .. traversal attempts before checking the ID
	cleanPath := filepath.ToSlash(filepath.Clean(filePath))
	cleanPath = strings.TrimPrefix(cleanPath, "/") // Remove leading slash if present
	pathParts := strings.Split(cleanPath, "/")

	// Check if this is a patient report file (structure: reports/{patientID}/...)
	if len(pathParts) >= 2 && pathParts[0] == "reports" {
		patientIDStr := pathParts[1]
		// Verify it's a valid patient ID (numeric)
		if patientID, err := strconv.ParseUint(patientIDStr, 10, 32); err == nil {
			userRole, _ := c.Locals("userRole").(string)
			userID, _ := c.Locals("userID").(string)

			// Doctors are restricted to their associated patients
			if userRole == "doctor" {
				userIDUint, err := strconv.ParseUint(userID, 10, 32)
				if err != nil {
					return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
				}
				isAssociated, err := models.IsDoctorAssociatedWithPatient(uint(userIDUint), uint(patientID))
				if err != nil {
					log.Printf("Error checking doctor-patient association for file access: %v", err)
					return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
				}
				if !isAssociated {
					return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied: You are not authorized to view this patient's files"})
				}
			}
			// Admin, User, Staff Doctor are allowed access to all files
		}
	}

	fullPath := filepath.Join(uploadRootDir, filePath)

	// Security check: ensure the path is within the uploads directory
	if !isPathSafe(fullPath) {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	// Check if file exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "File not found"})
	}

	// Set proper headers for PDF files
	c.Set("Content-Type", pdfContentType)
	c.Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", safeContentDispositionName(fullPath)))
	c.Set("X-Content-Type-Options", "nosniff")
	c.Set("Cache-Control", "private, no-store")
	c.Set("Content-Security-Policy", "default-src 'none'; img-src 'self' data:; style-src 'self'; frame-ancestors 'none'")

	return c.SendFile(fullPath)
}

// isPathSafe checks if the requested file path is safe
func isPathSafe(filePath string) bool {
	cleanPath, err := filepath.Abs(filepath.Clean(filePath))
	if err != nil {
		return false
	}

	uploadsDir, err := filepath.Abs(uploadRootDir)
	if err != nil {
		return false
	}

	if cleanPath == uploadsDir {
		return false
	}

	safePrefix := uploadsDir + string(os.PathSeparator)
	return strings.HasPrefix(cleanPath+string(os.PathSeparator), safePrefix)
}

func safeContentDispositionName(path string) string {
	base := filepath.Base(path)
	base = strings.ReplaceAll(base, "\"", "")
	base = strings.ReplaceAll(base, "\n", "")
	base = strings.ReplaceAll(base, "\r", "")
	if base == "" {
		return fmt.Sprintf("report-%d.pdf", time.Now().Unix())
	}
	return base
}
