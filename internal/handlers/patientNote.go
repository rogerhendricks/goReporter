package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

type PatientNoteResponse struct {
	ID        uint      `json:"id"`
	PatientID uint      `json:"patientId"`
	UserID    uint      `json:"userId"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	User      struct {
		ID       uint   `json:"id"`
		FullName string `json:"fullName"`
		Email    string `json:"email"`
	} `json:"user"`
}

func toPatientNoteResponse(note models.PatientNote) PatientNoteResponse {
	resp := PatientNoteResponse{
		ID:        note.ID,
		PatientID: note.PatientID,
		UserID:    note.UserID,
		Content:   note.Content,
		CreatedAt: note.CreatedAt,
		UpdatedAt: note.UpdatedAt,
	}

	resp.User.ID = note.User.ID
	resp.User.FullName = note.User.FullName
	resp.User.Email = note.User.Email

	return resp
}

// GetPatientNotes retrieves notes for a specific patient with pagination
func GetPatientNotes(c *fiber.Ctx) error {
	patientID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid patient ID",
		})
	}

	if role, ok := c.Locals("userRole").(string); ok && role == "doctor" {
		userIDVal := c.Locals("user_id")
		userID, ok := userIDVal.(uint)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user session"})
		}
		allowed, accessErr := models.IsDoctorAssociatedWithPatient(userID, uint(patientID))
		if accessErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify access"})
		}
		if !allowed {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
		}
	}

	// Pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "8"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 8
	}
	offset := (page - 1) * limit

	// Get total count
	var total int64
	if err := config.DB.Model(&models.PatientNote{}).Where("patient_id = ?", patientID).Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to count notes",
		})
	}

	// Get paginated notes
	var notes []models.PatientNote
	if err := config.DB.Where("patient_id = ?", patientID).
		Preload("User").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notes).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch notes",
		})
	}

	response := make([]PatientNoteResponse, len(notes))
	for i, note := range notes {
		response[i] = toPatientNoteResponse(note)
	}

	return c.JSON(fiber.Map{
		"notes":      response,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	})
}

// CreatePatientNote creates a new note for a patient
func CreatePatientNote(c *fiber.Ctx) error {
	patientID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid patient ID",
		})
	}

	// Get user ID from context (set by auth middleware)
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var input struct {
		Content string `json:"content"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid input",
		})
	}

	if input.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Content is required",
		})
	}

	note := models.PatientNote{
		PatientID: uint(patientID),
		UserID:    userID.(uint),
		Content:   input.Content,
	}

	if err := config.DB.Create(&note).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create note",
		})
	}

	// Load the user relationship
	if err := config.DB.Preload("User").First(&note, note.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load note",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(toPatientNoteResponse(note))
}

// UpdatePatientNote updates an existing note
func UpdatePatientNote(c *fiber.Ctx) error {
	noteID, err := strconv.Atoi(c.Params("noteId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid note ID",
		})
	}

	// Get user ID from context
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var note models.PatientNote
	if err := config.DB.First(&note, noteID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Note not found",
		})
	}

	// Only the creator can update the note
	if note.UserID != userID.(uint) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You can only edit your own notes",
		})
	}

	var input struct {
		Content string `json:"content"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid input",
		})
	}

	if input.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Content is required",
		})
	}

	note.Content = input.Content
	if err := config.DB.Save(&note).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update note",
		})
	}

	// Load the user relationship
	if err := config.DB.Preload("User").First(&note, note.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load note",
		})
	}

	return c.JSON(toPatientNoteResponse(note))
}

// DeletePatientNote deletes a note
func DeletePatientNote(c *fiber.Ctx) error {
	noteID, err := strconv.Atoi(c.Params("noteId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid note ID",
		})
	}

	// Get user ID from context
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var note models.PatientNote
	if err := config.DB.First(&note, noteID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Note not found",
		})
	}

	// Only the creator can delete the note
	if note.UserID != userID.(uint) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You can only delete your own notes",
		})
	}

	if err := config.DB.Delete(&note).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete note",
		})
	}

	return c.Status(fiber.StatusNoContent).Send(nil)
}
