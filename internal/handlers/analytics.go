package handlers

import (
    "log"
    "net/http"

    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/config"
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

    var totalReports int64
    if err := db.Table("reports").Count(&totalReports).Error; err != nil {
        log.Printf("analytics totalReports error: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count reports"})
    }

    var incompleteReports int64
    if err := db.Table("reports").
        Where("is_completed = ? OR is_completed IS NULL", false).
        Count(&incompleteReports).Error; err != nil {
        log.Printf("analytics incompleteReports error: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count incomplete reports"})
    }

    var byStatus []donutSlice
    if err := db.Table("reports").
        Select("COALESCE(report_status, 'Unknown') AS label, COUNT(*) AS count").
        Group("report_status").
        Scan(&byStatus).Error; err != nil {
        log.Printf("analytics byStatus error: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to build report status analytics"})
    }

    resp := analyticsResponse{
        ByManufacturer: byManufacturer,
        ByDeviceType:   byDeviceType,
        Reports: reportSummary{
            Total:      totalReports,
            Incomplete: incompleteReports,
            ByStatus:   byStatus,
        },
    }
    return c.JSON(resp)
}