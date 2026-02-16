package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
	"gorm.io/gorm"
)

type donutSlice struct {
	Label string `json:"label"`
	Count int64  `json:"count"`
}

type reportSummary struct {
	Total      int64        `json:"total"`
	Incomplete int64        `json:"incomplete"`
	ByStatus   []donutSlice `json:"byStatus"`
}

type analyticsResponse struct {
	ByManufacturer []donutSlice  `json:"byManufacturer"`
	ByDeviceType   []donutSlice  `json:"byDeviceType"`
	Reports        reportSummary `json:"reports"`
}

func buildReportSummary(c *fiber.Ctx, db *gorm.DB) (reportSummary, error) {
	dateLayout := "2006-01-02"
	startParam := c.Query("start")
	endParam := c.Query("end")

	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	startOfNextMonth := startOfMonth.AddDate(0, 1, 0)

	if endParam != "" && startParam == "" {
		return reportSummary{}, fiber.NewError(http.StatusBadRequest, "Start date is required when end date is provided. Use YYYY-MM-DD.")
	}

	if startParam != "" {
		parsedStart, err := time.ParseInLocation(dateLayout, startParam, now.Location())
		if err != nil {
			return reportSummary{}, fiber.NewError(http.StatusBadRequest, "Invalid start date. Use YYYY-MM-DD.")
		}
		if parsedStart.Day() != 1 {
			return reportSummary{}, fiber.NewError(http.StatusBadRequest, "Start date must be the first day of a month (YYYY-MM-DD).")
		}
		if parsedStart.Year() < 2025 || parsedStart.Year() > 2035 {
			return reportSummary{}, fiber.NewError(http.StatusBadRequest, "Start year must be between 2025 and 2035.")
		}
		startOfMonth = time.Date(parsedStart.Year(), parsedStart.Month(), 1, 0, 0, 0, 0, parsedStart.Location())
	}

	if endParam != "" {
		parsedEnd, err := time.ParseInLocation(dateLayout, endParam, now.Location())
		if err != nil {
			return reportSummary{}, fiber.NewError(http.StatusBadRequest, "Invalid end date. Use YYYY-MM-DD.")
		}
		if parsedEnd.Day() != 1 {
			return reportSummary{}, fiber.NewError(http.StatusBadRequest, "End date must be the first day of a month (YYYY-MM-DD).")
		}
		if parsedEnd.Year() < 2025 || parsedEnd.Year() > 2036 || (parsedEnd.Year() == 2036 && parsedEnd.Month() != time.January) {
			return reportSummary{}, fiber.NewError(http.StatusBadRequest, "End date must be within the 2025-2035 range.")
		}
		startOfNextMonth = time.Date(parsedEnd.Year(), parsedEnd.Month(), 1, 0, 0, 0, 0, parsedEnd.Location())
	} else if startParam != "" {
		startOfNextMonth = startOfMonth.AddDate(0, 1, 0)
	}

	if startParam != "" && endParam != "" {
		expectedEnd := startOfMonth.AddDate(0, 1, 0)
		if !startOfNextMonth.Equal(expectedEnd) {
			return reportSummary{}, fiber.NewError(http.StatusBadRequest, "End date must be the first day of the next month after start date.")
		}
	}

	if !startOfNextMonth.After(startOfMonth) {
		return reportSummary{}, fiber.NewError(http.StatusBadRequest, "Invalid date range. End must be after start.")
	}

	if startParam != "" {
		if startOfNextMonth.Year() > 2036 || (startOfNextMonth.Year() == 2036 && startOfNextMonth.Month() != time.January) {
			return reportSummary{}, fiber.NewError(http.StatusBadRequest, "Date range must be within the 2025-2035 range.")
		}
	}

	type statusRow struct {
		Label           string `json:"label"`
		Count           int64  `json:"count"`
		IncompleteCount int64  `json:"incomplete"`
	}

	var statusRows []statusRow
	if err := db.Model(&models.Report{}).
		Select("COALESCE(report_status, 'Unknown') AS label, COUNT(*) AS count, SUM(CASE WHEN is_completed = ? OR is_completed IS NULL THEN 1 ELSE 0 END) AS incomplete_count", false).
		Where("report_date >= ? AND report_date < ?", startOfMonth, startOfNextMonth).
		Group("report_status").
		Scan(&statusRows).Error; err != nil {
		log.Printf("analytics byStatus error: %v", err)
		return reportSummary{}, fiber.NewError(http.StatusInternalServerError, "Failed to build report status analytics")
	}

	var totalReports int64
	var incompleteReports int64
	byStatus := make([]donutSlice, 0, len(statusRows))
	for _, row := range statusRows {
		byStatus = append(byStatus, donutSlice{Label: row.Label, Count: row.Count})
		totalReports += row.Count
		incompleteReports += row.IncompleteCount
	}

	return reportSummary{
		Total:      totalReports,
		Incomplete: incompleteReports,
		ByStatus:   byStatus,
	}, nil
}

func GetAnalyticsSummary(c *fiber.Ctx) error {
	db := config.DB

	var byManufacturer []donutSlice
	if err := db.Table("implanted_devices").
		Joins("JOIN devices ON devices.id = implanted_devices.device_id").
		Where("implanted_devices.deleted_at IS NULL AND implanted_devices.explanted_at IS NULL").
		Select("COALESCE(devices.manufacturer, 'Unknown') AS label, COUNT(*) AS count").
		Group("devices.manufacturer").
		Scan(&byManufacturer).Error; err != nil {
		log.Printf("analytics byManufacturer error: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to build manufacturer analytics"})
	}

	var byDeviceType []donutSlice
	if err := db.Table("implanted_devices").
		Joins("JOIN devices ON devices.id = implanted_devices.device_id").
		Where("implanted_devices.deleted_at IS NULL AND implanted_devices.explanted_at IS NULL").
		Select("COALESCE(devices.type, 'Unknown') AS label, COUNT(*) AS count").
		Group("devices.type").
		Scan(&byDeviceType).Error; err != nil {
		log.Printf("analytics byDeviceType error: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to build device type analytics"})
	}

	summary, err := buildReportSummary(c, db)
	if err != nil {
		if fiberErr, ok := err.(*fiber.Error); ok {
			return c.Status(fiberErr.Code).JSON(fiber.Map{"error": fiberErr.Message})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to build report summary"})
	}

	resp := analyticsResponse{
		ByManufacturer: byManufacturer,
		ByDeviceType:   byDeviceType,
		Reports:        summary,
	}
	return c.JSON(resp)
}

func GetReportSummary(c *fiber.Ctx) error {
	db := config.DB
	summary, err := buildReportSummary(c, db)
	if err != nil {
		if fiberErr, ok := err.(*fiber.Error); ok {
			return c.Status(fiberErr.Code).JSON(fiber.Map{"error": fiberErr.Message})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to build report summary"})
	}
	return c.JSON(summary)
}
