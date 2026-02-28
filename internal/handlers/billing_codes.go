package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

// GetBillingCodes Retrieves all billing codes and their categories
func GetBillingCodes(c *fiber.Ctx) error {
	codes, err := models.GetAllBillingCodes()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve billing codes"})
	}

	return c.Status(http.StatusOK).JSON(codes)
}

// UpdateBillingCode Request
type UpdateBillingCodeRequest struct {
	Code string `json:"code"`
}

// UpdateBillingCode Updates a specific billing code based on category name
func UpdateBillingCode(c *fiber.Ctx) error {
	rawCategory := c.Params("category")
	category, err := url.QueryUnescape(rawCategory)
	if err != nil || category == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Category parameter is required and must be properly encoded"})
	}

	var req UpdateBillingCodeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	bc, err := models.UpdateBillingCode(category, req.Code)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update billing code"})
	}

	return c.Status(http.StatusOK).JSON(bc)
}

// ExportBillingCodes Export CSV for completed billing codes within date range
func ExportBillingCodesCSV(c *fiber.Ctx) error {
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")

	// Parse dates or default to a reasonable window
	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid startDate format. Use YYYY-MM-DD"})
		}
	} else {
		// default to last 7 days
		startDate = time.Now().AddDate(0, 0, -7)
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid endDate format. Use YYYY-MM-DD"})
		}
	} else {
		endDate = time.Now()
	}

	// 1. Get all completed reports within date range
	var reports []models.Report
	err = config.DB.Preload("Patient").
		Where("is_completed = ? AND report_date >= ? AND report_date <= ?", true, startDate, endDate).
		Find(&reports).Error

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Error fetching reports"})
	}

	// 2. Get billing codes map
	codes, err := models.GetAllBillingCodes()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Error fetching billing codes"})
	}

	codeMap := make(map[string]string)
	for _, bc := range codes {
		codeMap[strings.ToLower(bc.Category)] = bc.Code
	}

	// 3. Generate CSV
	c.Set(fiber.HeaderContentType, "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"billing_export_%s_to_%s.csv\"", startDate.Format("20060102"), endDate.Format("20060102")))

	writer := csv.NewWriter(c.Response().BodyWriter())
	defer writer.Flush()

	// Write Headers
	headers := []string{"Patient MRN", "Patient Name", "Report Date", "Encounter Type (Category)", "Billing Code"}
	_ = writer.Write(headers)

	// Write Rows
	for _, report := range reports {
		cat := strings.ToLower(strings.TrimSpace(report.ReportType))
		billingCode := codeMap[cat]
		if billingCode == "" {
			billingCode = "NO_CODE_CONFIGURED"
		}

		patientName := fmt.Sprintf("%s %s", report.Patient.FirstName, report.Patient.LastName)
		row := []string{
			fmt.Sprintf("%d", report.Patient.MRN),
			patientName,
			report.ReportDate.Format("2006-01-02"),
			report.ReportType,
			billingCode,
		}
		_ = writer.Write(row)
	}

	return nil
}
