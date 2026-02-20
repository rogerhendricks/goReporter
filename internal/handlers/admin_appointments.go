package handlers

import (
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

// GetAdminAppointments returns paginated appointments for admin dashboards.
// Currently supports filter=missed (status scheduled and start_at older than grace window).
func GetAdminAppointments(c *fiber.Ctx) error {
	cfg := config.LoadConfig()

	page := parsePositiveInt(c.Query("page"), 1)
	limit := parsePositiveInt(c.Query("limit"), 15)
	if limit > 200 {
		limit = 200
	}
	lookbackDays := cfg.MissedLookbackDays
	if lookbackDays <= 0 {
		lookbackDays = 7
	}
	now := time.Now().UTC()

	filter := strings.ToLower(strings.TrimSpace(c.Query("filter", "missed")))

	query := config.DB.Model(&models.Appointment{}).
		Preload("Patient").
		Preload("CreatedBy")

	switch filter {
	case "", "missed":
		// Missed: still scheduled and start time is older than now - grace minutes, but not older than lookback window.
		graceCutoff := now.Add(-time.Duration(cfg.MissedGraceMinutes) * time.Minute)
		lookbackCutoff := now.Add(-time.Duration(lookbackDays) * 24 * time.Hour)
		query = query.Where("status = ?", models.AppointmentStatusScheduled).
			Where("start_at < ?", graceCutoff).
			Where("start_at >= ?", lookbackCutoff)
	default:
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Unsupported filter"})
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count appointments"})
	}

	offset := (page - 1) * limit

	var appointments []models.Appointment
	if err := query.Order("start_at ASC").Limit(limit).Offset(offset).Find(&appointments).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load appointments"})
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	return c.JSON(fiber.Map{
		"data": toAppointmentResponses(appointments),
		"pagination": fiber.Map{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
		"graceMinutes":   cfg.MissedGraceMinutes,
		"lookbackDays":   lookbackDays,
		"lookbackCutoff": now.Add(-time.Duration(lookbackDays) * 24 * time.Hour),
	})
}

type markLettersRequest struct {
	AppointmentIDs []uint `json:"appointmentIds"`
}

// MarkMissedLettersSent sets missed_letter_sent_at for the provided appointment IDs.
func MarkMissedLettersSent(c *fiber.Ctx) error {
	var payload markLettersRequest
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	if len(payload.AppointmentIDs) == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "appointmentIds required"})
	}

	now := time.Now().UTC()
	res := config.DB.Model(&models.Appointment{}).
		Where("id IN ?", payload.AppointmentIDs).
		Updates(map[string]interface{}{"missed_letter_sent_at": now})

	if res.Error != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to mark letters"})
	}

	return c.JSON(fiber.Map{"updated": res.RowsAffected, "timestamp": now})
}

func parsePositiveInt(val string, fallback int) int {
	if parsed, err := strconv.Atoi(val); err == nil && parsed > 0 {
		return parsed
	}
	return fallback
}
