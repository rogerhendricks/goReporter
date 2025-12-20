package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/rogerhendricks/goReporter/internal/services"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ReportBuilderHandler struct {
	DB           *gorm.DB
	QueryBuilder *services.QueryBuilder
}

func NewReportBuilderHandler(db *gorm.DB) *ReportBuilderHandler {
	return &ReportBuilderHandler{
		DB:           db,
		QueryBuilder: services.NewQueryBuilder(),
	}
}

// GetAvailableFields returns all fields that can be used in reports
func (h *ReportBuilderHandler) GetAvailableFields(c *fiber.Ctx) error {
	fields := []models.ReportField{
		// Patient fields
		{ID: "patients.id", Name: "id", Label: "Patient ID", Type: "number", Table: "patients"},
		{ID: "patients.first_name", Name: "first_name", Label: "First Name", Type: "string", Table: "patients"},
		{ID: "patients.last_name", Name: "last_name", Label: "Last Name", Type: "string", Table: "patients"},
		{ID: "patients.date_of_birth", Name: "date_of_birth", Label: "Date of Birth", Type: "date", Table: "patients"},
		{ID: "patients.mrn", Name: "mrn", Label: "MRN", Type: "string", Table: "patients"},
		{ID: "patients.created_at", Name: "created_at", Label: "Created At", Type: "date", Table: "patients"},

		// Device fields (from devices table)
		{ID: "devices.id", Name: "id", Label: "Device ID", Type: "number", Table: "devices"},
		{ID: "devices.name", Name: "name", Label: "Device Name", Type: "string", Table: "devices"},
		{ID: "devices.manufacturer", Name: "manufacturer", Label: "Manufacturer", Type: "string", Table: "devices"},
		{ID: "devices.dev_model", Name: "dev_model", Label: "Model", Type: "string", Table: "devices"},
		{ID: "devices.type", Name: "type", Label: "Type", Type: "string", Table: "devices"},
		{ID: "devices.is_mri", Name: "is_mri", Label: "MRI Compatible", Type: "boolean", Table: "devices"},

		// Report fields
		{ID: "reports.id", Name: "id", Label: "Report ID", Type: "number", Table: "reports"},
		{ID: "reports.report_date", Name: "report_date", Label: "Report Date", Type: "date", Table: "reports"},
		{ID: "reports.report_type", Name: "report_type", Label: "Report Type", Type: "string", Table: "reports"},
		{ID: "reports.report_status", Name: "report_status", Label: "Report Status", Type: "string", Table: "reports"},
		{ID: "reports.current_heart_rate", Name: "current_heart_rate", Label: "Heart Rate", Type: "number", Table: "reports"},
		{ID: "reports.current_rhythm", Name: "current_rhythm", Label: "Current Rhythm", Type: "string", Table: "reports"},
		{ID: "reports.created_at", Name: "created_at", Label: "Created At", Type: "date", Table: "reports"},

		// Task fields
		{ID: "tasks.id", Name: "id", Label: "Task ID", Type: "number", Table: "tasks"},
		{ID: "tasks.title", Name: "title", Label: "Title", Type: "string", Table: "tasks"},
		{ID: "tasks.due_date", Name: "due_date", Label: "Due Date", Type: "date", Table: "tasks"},
		{ID: "tasks.status", Name: "status", Label: "Status", Type: "string", Table: "tasks"},
		{ID: "tasks.priority", Name: "priority", Label: "Priority", Type: "string", Table: "tasks"},
	}

	return c.JSON(fields)
}

// ExecuteReport executes a custom report and returns results
func (h *ReportBuilderHandler) ExecuteReport(c *fiber.Ctx) error {
	var definition models.ReportDef
	if err := c.BodyParser(&definition); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Build SQL query
	query, args, err := h.QueryBuilder.BuildQuery(definition)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Execute query
	startTime := time.Now()
	rows, err := h.DB.Raw(query, args...).Rows()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to execute query",
		})
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read columns",
		})
	}

	// Read results
	var results [][]interface{}
	for rows.Next() {
		// Create slice for scanning
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to scan row",
			})
		}

		results = append(results, values)
	}

	executionTime := time.Since(startTime).Milliseconds()

	return c.JSON(fiber.Map{
		"columns":        columns,
		"rows":           results,
		"total_rows":     len(results),
		"execution_time": executionTime,
	})
}

// SaveReport saves a custom report definition
func (h *ReportBuilderHandler) SaveReport(c *fiber.Ctx) error {
	var report models.CustomReport
	if err := c.BodyParser(&report); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get user from context
	userID := c.Locals("userID").(uint)
	report.CreatedBy = userID

	if err := h.DB.Create(&report).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save report",
		})
	}

	return c.JSON(report)
}

// GetSavedReports returns all saved reports for the user
func (h *ReportBuilderHandler) GetSavedReports(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var reports []models.CustomReport
	if err := h.DB.Where("created_by = ?", userID).
		Or("is_template = ?", true).
		Order("created_at DESC").
		Find(&reports).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch reports",
		})
	}

	return c.JSON(reports)
}

// GetReportById returns a specific saved report
func (h *ReportBuilderHandler) GetReportById(c *fiber.Ctx) error {
	reportID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid report ID",
		})
	}

	userID := c.Locals("userID").(uint)

	var report models.CustomReport
	if err := h.DB.Where("id = ? AND (created_by = ? OR is_template = ?)", reportID, userID, true).
		First(&report).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"error": "Report not found",
			})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch report",
		})
	}

	return c.JSON(report)
}

// UpdateReport updates an existing report
func (h *ReportBuilderHandler) UpdateReport(c *fiber.Ctx) error {
	reportID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid report ID",
		})
	}

	userID := c.Locals("userID").(uint)

	// Check if report exists and belongs to user
	var existingReport models.CustomReport
	if err := h.DB.Where("id = ? AND created_by = ?", reportID, userID).
		First(&existingReport).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"error": "Report not found",
			})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch report",
		})
	}

	// Parse updated report data
	var updatedReport models.CustomReport
	if err := c.BodyParser(&updatedReport); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update only allowed fields
	existingReport.Name = updatedReport.Name
	existingReport.Description = updatedReport.Description
	existingReport.Definition = updatedReport.Definition
	existingReport.IsTemplate = updatedReport.IsTemplate

	if err := h.DB.Save(&existingReport).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update report",
		})
	}

	return c.JSON(existingReport)
}

// DeleteReport deletes a saved report
func (h *ReportBuilderHandler) DeleteReport(c *fiber.Ctx) error {
	reportID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid report ID",
		})
	}

	userID := c.Locals("userID").(uint)

	result := h.DB.Where("id = ? AND created_by = ?", reportID, userID).
		Delete(&models.CustomReport{})

	if result.Error != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete report",
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "Report not found",
		})
	}

	return c.SendStatus(http.StatusNoContent)
}

// ExportToCSV exports report results to CSV format
func (h *ReportBuilderHandler) ExportToCSV(c *fiber.Ctx) error {
	var definition models.ReportDef
	if err := c.BodyParser(&definition); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Build and execute query
	query, args, err := h.QueryBuilder.BuildQuery(definition)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	rows, err := h.DB.Raw(query, args...).Rows()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to execute query",
		})
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read columns",
		})
	}

	// Set CSV headers
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=report.csv")

	// Write CSV header
	csvHeader := ""
	for i, col := range columns {
		if i > 0 {
			csvHeader += ","
		}
		csvHeader += col
	}
	csvHeader += "\n"
	c.WriteString(csvHeader)

	// Write data rows
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range columns {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return err
		}

		csvRow := ""
		for i, val := range values {
			if i > 0 {
				csvRow += ","
			}
			if val != nil {
				csvRow += fmt.Sprintf("%v", val)
			}
		}
		csvRow += "\n"
		c.WriteString(csvRow)
	}

	return nil
}

// ExportToExcel exports report results to Excel format (basic CSV with .xlsx extension)
func (h *ReportBuilderHandler) ExportToExcel(c *fiber.Ctx) error {
	var definition models.ReportDef
	if err := c.BodyParser(&definition); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Build and execute query
	query, args, err := h.QueryBuilder.BuildQuery(definition)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	rows, err := h.DB.Raw(query, args...).Rows()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to execute query",
		})
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read columns",
		})
	}

	// For now, export as CSV with .xlsx extension
	// TODO: Implement proper Excel format with github.com/xuri/excelize
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename=report.xlsx")

	// Write CSV header
	csvHeader := ""
	for i, col := range columns {
		if i > 0 {
			csvHeader += ","
		}
		csvHeader += col
	}
	csvHeader += "\n"
	c.WriteString(csvHeader)

	// Write data rows
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range columns {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return err
		}

		csvRow := ""
		for i, val := range values {
			if i > 0 {
				csvRow += ","
			}
			if val != nil {
				csvRow += fmt.Sprintf("%v", val)
			}
		}
		csvRow += "\n"
		c.WriteString(csvRow)
	}

	return nil
}

// ExportToPDF exports report results to PDF format
func (h *ReportBuilderHandler) ExportToPDF(c *fiber.Ctx) error {
	var definition models.ReportDef
	if err := c.BodyParser(&definition); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Build and execute query
	query, args, err := h.QueryBuilder.BuildQuery(definition)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	rows, err := h.DB.Raw(query, args...).Rows()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to execute query",
		})
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read columns",
		})
	}

	// For now, return as plain text with PDF headers
	// TODO: Implement proper PDF format with github.com/jung-kurt/gofpdf or similar
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", "attachment; filename=report.pdf")

	// Write header
	header := "Report\n\n"
	for i, col := range columns {
		if i > 0 {
			header += " | "
		}
		header += col
	}
	header += "\n" + strings.Repeat("-", 80) + "\n"
	c.WriteString(header)

	// Write data rows
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range columns {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return err
		}

		row := ""
		for i, val := range values {
			if i > 0 {
				row += " | "
			}
			if val != nil {
				row += fmt.Sprintf("%v", val)
			} else {
				row += "NULL"
			}
		}
		row += "\n"
		c.WriteString(row)
	}

	return nil
}
