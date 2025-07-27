package handlers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/models"
    "net/http"
    "log"
    "strings"
    "html"
    "errors"
    "gorm.io/gorm"
    "strconv"
)

// GetMedications retrieves all medications
func GetMedications(c *fiber.Ctx) error {
    medications, err := models.GetAllMedications()
    if err != nil {
        log.Printf("Error fetching medications: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch medications"})
    }
    return c.JSON(medications)
}

// GetMedication retrieves a specific medication by ID
func GetMedication(c *fiber.Ctx) error {
    medicationID := c.Params("id")
    
    id, err := strconv.ParseUint(medicationID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid medication ID format"})
    }
    
    medication, err := models.GetMedicationByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Medication not found"})
        }
        log.Printf("Error fetching medication %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    return c.JSON(medication)
}

// CreateMedication creates a new medication
func CreateMedication(c *fiber.Ctx) error {
    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }
    
    var newMedication models.Medication
    if err := c.BodyParser(&newMedication); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }
    
    // Validate and sanitize
    if strings.TrimSpace(newMedication.Name) == "" {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Medication name is required"})
    }
    
    newMedication.Name = html.EscapeString(strings.TrimSpace(newMedication.Name))
    newMedication.Description = html.EscapeString(strings.TrimSpace(newMedication.Description))
    newMedication.Dosage = html.EscapeString(strings.TrimSpace(newMedication.Dosage))
    newMedication.Category = html.EscapeString(strings.TrimSpace(newMedication.Category))
    
    if err := models.CreateMedication(&newMedication); err != nil {
        log.Printf("Error creating medication: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create medication"})
    }
    
    return c.Status(http.StatusCreated).JSON(newMedication)
}

// UpdateMedication updates an existing medication
func UpdateMedication(c *fiber.Ctx) error {
    medicationID := c.Params("id")
    
    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }
    
    id, err := strconv.ParseUint(medicationID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid medication ID format"})
    }
    
    existingMedication, err := models.GetMedicationByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Medication not found"})
        }
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    var updateData models.Medication
    if err := c.BodyParser(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }
    
    // Update fields if provided
    if updateData.Name != "" {
        existingMedication.Name = html.EscapeString(strings.TrimSpace(updateData.Name))
    }
    if updateData.Description != "" {
        existingMedication.Description = html.EscapeString(strings.TrimSpace(updateData.Description))
    }
    if updateData.Dosage != "" {
        existingMedication.Dosage = html.EscapeString(strings.TrimSpace(updateData.Dosage))
    }
    if updateData.Category != "" {
        existingMedication.Category = html.EscapeString(strings.TrimSpace(updateData.Category))
    }
    
    if err := models.UpdateMedication(existingMedication); err != nil {
        log.Printf("Error updating medication %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update medication"})
    }
    
    return c.JSON(existingMedication)
}

// DeleteMedication deletes a medication by ID
func DeleteMedication(c *fiber.Ctx) error {
    medicationID := c.Params("id")
    
    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }
    
    id, err := strconv.ParseUint(medicationID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid medication ID format"})
    }
    
    // Check if medication exists
    _, err = models.GetMedicationByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Medication not found"})
        }
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    if err := models.DeleteMedication(uint(id)); err != nil {
        log.Printf("Error deleting medication %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete medication"})
    }
    
    return c.SendStatus(http.StatusNoContent)
}