package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

func GetAllTags(c *fiber.Ctx) error {
	var tags []models.Tag
	if err := config.DB.Find(&tags).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch tags"})
	}
	return c.JSON(tags)
}

func CreateTag(c *fiber.Ctx) error {
	var tag models.Tag
	if err := c.BodyParser(&tag); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := config.DB.Create(&tag).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create tag"})
	}

	return c.Status(fiber.StatusCreated).JSON(tag)
}

func UpdateTag(c *fiber.Ctx) error {
	id := c.Params("id")
	var tag models.Tag

	if err := config.DB.First(&tag, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Tag not found"})
	}

	var updateData models.Tag
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	tag.Name = updateData.Name
	tag.Color = updateData.Color
	tag.Description = updateData.Description

	if err := config.DB.Save(&tag).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update tag"})
	}

	return c.JSON(tag)
}

func DeleteTag(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Delete(&models.Tag{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete tag"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GetPatientTagStats returns statistics about patients with/without a specific tag
func GetPatientTagStats(c *fiber.Ctx) error {
	tagID := c.Query("tagId")
	if tagID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tagId query parameter is required"})
	}

	// Get total number of patients
	var totalPatients int64
	if err := config.DB.Model(&models.Patient{}).Count(&totalPatients).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count patients"})
	}

	// Count patients with this tag
	var patientsWithTag int64
	query := `
		SELECT COUNT(DISTINCT patient_id) 
		FROM patient_tags 
		WHERE tag_id = ?
	`
	if err := config.DB.Raw(query, tagID).Scan(&patientsWithTag).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count patients with tag"})
	}

	patientsWithoutTag := totalPatients - patientsWithTag

	// Get tag name
	var tag models.Tag
	if err := config.DB.First(&tag, tagID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Tag not found"})
	}

	return c.JSON(fiber.Map{
		"tagId":              tag.ID,
		"tagName":            tag.Name,
		"totalPatients":      totalPatients,
		"patientsWithTag":    patientsWithTag,
		"patientsWithoutTag": patientsWithoutTag,
	})
}
