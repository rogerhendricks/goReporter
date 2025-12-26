package handlers

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/rogerhendricks/goReporter/internal/services"
	"gorm.io/gorm"
)

var webhookService *services.WebhookService

// InitWebhookService initializes the webhook service
func InitWebhookService(db *gorm.DB) {
	webhookService = services.NewWebhookService(db)
}

// GetWebhooks returns all webhooks for the authenticated user
func GetWebhooks(c *fiber.Ctx) error {
	var webhooks []models.Webhook

	if err := config.DB.Order("created_at DESC").Find(&webhooks).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch webhooks",
		})
	}

	return c.JSON(webhooks)
}

// GetWebhook returns a single webhook by ID
func GetWebhook(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid webhook ID",
		})
	}

	var webhook models.Webhook
	if err := config.DB.First(&webhook, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Webhook not found",
		})
	}

	return c.JSON(webhook)
}

// CreateWebhook creates a new webhook
func CreateWebhook(c *fiber.Ctx) error {
	var webhook models.Webhook

	if err := c.BodyParser(&webhook); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if webhook.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Webhook name is required",
		})
	}

	if webhook.URL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Webhook URL is required",
		})
	}

	if len(webhook.Events) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "At least one event is required",
		})
	}

	// Get user ID from context
	userID, ok := c.Locals("userID").(uint)
	if ok {
		webhook.CreatedBy = userID
	}

	if err := config.DB.Create(&webhook).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create webhook",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(webhook)
}

// UpdateWebhook updates an existing webhook
func UpdateWebhook(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid webhook ID",
		})
	}

	var webhook models.Webhook
	if err := config.DB.First(&webhook, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Webhook not found",
		})
	}

	var updates models.Webhook
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update allowed fields
	if updates.Name != "" {
		webhook.Name = updates.Name
	}
	if updates.URL != "" {
		webhook.URL = updates.URL
	}
	if len(updates.Events) > 0 {
		webhook.Events = updates.Events
	}
	if updates.Description != "" {
		webhook.Description = updates.Description
	}
	// Update secret only if provided
	if updates.Secret != "" {
		webhook.Secret = updates.Secret
	}
	// Update active status
	webhook.Active = updates.Active

	if err := config.DB.Save(&webhook).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update webhook",
		})
	}

	return c.JSON(webhook)
}

// DeleteWebhook deletes a webhook
func DeleteWebhook(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid webhook ID",
		})
	}

	var webhook models.Webhook
	if err := config.DB.First(&webhook, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Webhook not found",
		})
	}

	if err := config.DB.Delete(&webhook).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete webhook",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// TestWebhook sends a test payload to the webhook endpoint
func TestWebhook(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid webhook ID",
		})
	}

	if webhookService == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Webhook service not initialized",
		})
	}

	if err := webhookService.TestWebhook(uint(id)); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Test webhook sent successfully. Check delivery logs for results.",
	})
}

// GetWebhookDeliveries returns delivery logs for a webhook
func GetWebhookDeliveries(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid webhook ID",
		})
	}

	// Parse query parameters
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	var deliveries []models.WebhookDelivery
	var total int64

	// Get total count
	config.DB.Model(&models.WebhookDelivery{}).Where("webhook_id = ?", id).Count(&total)

	// Get deliveries
	if err := config.DB.
		Where("webhook_id = ?", id).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&deliveries).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch delivery logs",
		})
	}

	return c.JSON(fiber.Map{
		"deliveries": deliveries,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
	})
}

// TriggerWebhook is a helper function that can be called from other handlers
func TriggerWebhook(event models.WebhookEvent, data map[string]interface{}) {
	if webhookService != nil {
		webhookService.TriggerWebhooks(event, data)
	} else {
		fmt.Println("Warning: Webhook service not initialized, skipping webhook trigger")
	}
}
