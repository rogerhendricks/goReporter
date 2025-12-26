package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
	"gorm.io/gorm"
)

// --- DTOs for API Responses ---

type ArrhythmiaResponse struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Duration *int   `json:"duration"`
	Count    *int   `json:"count"`
}

type ReportResponse struct {
	ID                             uint                 `json:"id"`
	PatientID                      uint                 `json:"patientId"`
	UserID                         uint                 `json:"userId"`
	DoctorID                       *uint                `json:"doctorId"`
	ReportDate                     time.Time            `json:"reportDate"`
	ReportType                     string               `json:"reportType"`
	ReportStatus                   string               `json:"reportStatus"`
	CurrentHeartRate               *int                 `json:"currentHeartRate"`
	CurrentRhythm                  *string              `json:"currentRhythm"`
	CurrentDependency              *string              `json:"currentDependency"`
	MdcIdcStatAtafBurdenPercent    *float64             `json:"mdc_idc_stat_ataf_burden_percent"`
	QrsDuration                    *float64             `json:"qrs_duration"`
	MdcIdcSetBradyMode             *string              `json:"mdc_idc_set_brady_mode"`
	MdcIdcSetBradyLowrate          *int                 `json:"mdc_idc_set_brady_lowrate"`
	MdcIdcSetBradyMaxTrackingRate  *int                 `json:"mdc_idc_set_brady_max_tracking_rate"`
	MdcIdcSetBradyMaxSensorRate    *int                 `json:"mdc_idc_set_brady_max_sensor_rate"`
	MdcIdcDevSav                   *string              `json:"mdc_idc_dev_sav"`
	MdcIdcDevPav                   *string              `json:"mdc_idc_dev_pav"`
	MdcIdcStatBradyRaPercentPaced  *float64             `json:"mdc_idc_stat_brady_ra_percent_paced"`
	MdcIdcStatBradyRvPercentPaced  *float64             `json:"mdc_idc_stat_brady_rv_percent_paced"`
	MdcIdcStatBradyLvPercentPaced  *float64             `json:"mdc_idc_stat_brady_lv_percent_paced"`
	MdcIdcStatTachyBivPercentPaced *float64             `json:"mdc_idc_stat_tachy_biv_percent_paced"`
	MdcIdcBattVolt                 *float64             `json:"mdc_idc_batt_volt"`
	MdcIdcBattRemaining            *float64             `json:"mdc_idc_batt_remaining"`
	MdcIdcBattPercentage           *float64             `json:"mdc_idc_batt_percentage"`
	MdcIdcBattStatus               *string              `json:"mdc_idc_batt_status"`
	MdcIdcCapChargeTime            *float64             `json:"mdc_idc_cap_charge_time"`
	MdcIdcMsmtRaImpedanceMean      *float64             `json:"mdc_idc_msmt_ra_impedance_mean"`
	MdcIdcMsmtRaSensing            *float64             `json:"mdc_idc_msmt_ra_sensing"`
	MdcIdcMsmtRaPacingThreshold    *float64             `json:"mdc_idc_msmt_ra_pacing_threshold"`
	MdcIdcMsmtRaPw                 *float64             `json:"mdc_idc_msmt_ra_pw"`
	MdcIdcMsmtRvImpedanceMean      *float64             `json:"mdc_idc_msmt_rv_impedance_mean"`
	MdcIdcMsmtRvSensing            *float64             `json:"mdc_idc_msmt_rv_sensing"`
	MdcIdcMsmtRvPacingThreshold    *float64             `json:"mdc_idc_msmt_rv_pacing_threshold"`
	MdcIdcMsmtRvPw                 *float64             `json:"mdc_idc_msmt_rv_pw"`
	MdcIdcMsmtShockImpedance       *float64             `json:"mdc_idc_msmt_shock_impedance"`
	MdcIdcMsmtLvImpedanceMean      *float64             `json:"mdc_idc_msmt_lv_impedance_mean"`
	MdcIdcMsmtLvSensing            *float64             `json:"mdc_idc_msmt_lv_sensing"`
	MdcIdcMsmtLvPacingThreshold    *float64             `json:"mdc_idc_msmt_lv_pacing_threshold"`
	MdcIdcMsmtLvPw                 *float64             `json:"mdc_idc_msmt_lv_pw"`
	Comments                       *string              `json:"comments"`
	IsCompleted                    *bool                `json:"isCompleted"`
	FilePath                       *string              `json:"file_path"`
	FileUrl                        *string              `json:"file_url"`
	Arrhythmias                    []ArrhythmiaResponse `json:"arrhythmias"`
	Tags                           []models.Tag         `json:"tags"`
	CreatedAt                      time.Time            `json:"createdAt"`
	UpdatedAt                      time.Time            `json:"updatedAt"`
}

type RecentReportItem struct {
	ID           uint      `json:"id"`
	ReportDate   time.Time `json:"reportDate"`
	ReportType   string    `json:"reportType"`
	ReportStatus string    `json:"reportStatus"`
	Patient      struct {
		ID        uint   `json:"id"`
		LastName  string `json:"fname"`
		FirstName string `json:"lname"`
		MRN       string `json:"mrn"`
	} `json:"patient"`
	CreatedBy string `json:"createdBy,omitempty"`
}

// toReportResponse converts a Report model to a ReportResponse DTO
func toReportResponse(report models.Report) ReportResponse {
	resp := ReportResponse{
		ID:                             report.ID,
		PatientID:                      report.PatientID,
		UserID:                         report.UserID,
		DoctorID:                       report.DoctorID,
		ReportDate:                     report.ReportDate,
		ReportType:                     report.ReportType,
		ReportStatus:                   report.ReportStatus,
		CurrentHeartRate:               report.CurrentHeartRate,
		CurrentRhythm:                  report.CurrentRhythm,
		CurrentDependency:              report.CurrentDependency,
		MdcIdcStatAtafBurdenPercent:    report.MdcIdcStatAtafBurdenPercent,
		QrsDuration:                    report.QrsDuration,
		MdcIdcSetBradyMode:             report.MdcIdcSetBradyMode,
		MdcIdcSetBradyLowrate:          report.MdcIdcSetBradyLowrate,
		MdcIdcSetBradyMaxTrackingRate:  report.MdcIdcSetBradyMaxTrackingRate,
		MdcIdcSetBradyMaxSensorRate:    report.MdcIdcSetBradyMaxSensorRate,
		MdcIdcDevSav:                   report.MdcIdcDevSav,
		MdcIdcDevPav:                   report.MdcIdcDevPav,
		MdcIdcStatBradyRaPercentPaced:  report.MdcIdcStatBradyRaPercentPaced,
		MdcIdcStatBradyRvPercentPaced:  report.MdcIdcStatBradyRvPercentPaced,
		MdcIdcStatBradyLvPercentPaced:  report.MdcIdcStatBradyLvPercentPaced,
		MdcIdcStatTachyBivPercentPaced: report.MdcIdcStatTachyBivPercentPaced,
		MdcIdcBattVolt:                 report.MdcIdcBattVolt,
		MdcIdcBattRemaining:            report.MdcIdcBattRemaining,
		MdcIdcBattPercentage:           report.MdcIdcBattPercentage,
		MdcIdcBattStatus:               report.MdcIdcBattStatus,
		MdcIdcCapChargeTime:            report.MdcIdcCapChargeTime,
		MdcIdcMsmtRaImpedanceMean:      report.MdcIdcMsmtRaImpedanceMean,
		MdcIdcMsmtRaSensing:            report.MdcIdcMsmtRaSensing,
		MdcIdcMsmtRaPacingThreshold:    report.MdcIdcMsmtRaPacingThreshold,
		MdcIdcMsmtRaPw:                 report.MdcIdcMsmtRaPw,
		MdcIdcMsmtRvImpedanceMean:      report.MdcIdcMsmtRvImpedanceMean,
		MdcIdcMsmtRvSensing:            report.MdcIdcMsmtRvSensing,
		MdcIdcMsmtRvPacingThreshold:    report.MdcIdcMsmtRvPacingThreshold,
		MdcIdcMsmtRvPw:                 report.MdcIdcMsmtRvPw,
		MdcIdcMsmtShockImpedance:       report.MdcIdcMsmtShockImpedance,
		MdcIdcMsmtLvImpedanceMean:      report.MdcIdcMsmtLvImpedanceMean,
		MdcIdcMsmtLvSensing:            report.MdcIdcMsmtLvSensing,
		MdcIdcMsmtLvPacingThreshold:    report.MdcIdcMsmtLvPacingThreshold,
		MdcIdcMsmtLvPw:                 report.MdcIdcMsmtLvPw,
		Comments:                       report.Comments,
		IsCompleted:                    report.IsCompleted,
		FilePath:                       report.FilePath,
		FileUrl:                        report.FileUrl,
		CreatedAt:                      report.CreatedAt,
		UpdatedAt:                      report.UpdatedAt,
	}

	for _, arrhythmia := range report.Arrhythmias {
		resp.Arrhythmias = append(resp.Arrhythmias, ArrhythmiaResponse{
			ID:       arrhythmia.ID,
			Name:     arrhythmia.Name,
			Type:     arrhythmia.Type,
			Duration: arrhythmia.Duration,
			Count:    arrhythmia.Count,
		})
	}

	if len(report.Tags) > 0 {
		resp.Tags = report.Tags
	} else {
		resp.Tags = []models.Tag{}
	}

	return resp
}

// parseReportForm is a helper to parse multipart form data for Create/Update
func parseReportForm(c *fiber.Ctx) (*models.Report, error) {
	// Get user ID from JWT token
	userIDStr, ok := c.Locals("userID").(string)
	if !ok {
		return nil, errors.New("invalid authentication token")
	}

	// Convert the string User ID to uint
	uid, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return nil, errors.New("invalid authentication token: user ID is not a valid number")
	}
	userID := uint(uid)

	// --- Parse Form Fields ---
	patientID, err := strconv.ParseUint(c.FormValue("patientId"), 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid patientId: %w", err)
	}

	reportDate, err := time.Parse(time.RFC3339, c.FormValue("reportDate"))
	if err != nil {
		reportDate, err = time.Parse("2006-01-02", c.FormValue("reportDate"))
		if err != nil {
			return nil, fmt.Errorf("invalid date format for reportDate: %w", err)
		}
	}

	// Create the base report model from form values
	report := models.Report{
		PatientID:    uint(patientID),
		UserID:       userID,
		ReportDate:   reportDate,
		ReportType:   c.FormValue("reportType"),
		ReportStatus: c.FormValue("reportStatus"),
	}

	// --- Helper functions for parsing optional fields ---
	parseInt := func(key string) *int {
		valStr := c.FormValue(key)
		if val, err := strconv.Atoi(valStr); err == nil {
			return &val
		}
		return nil
	}
	parseUint := func(key string) *uint {
		valStr := c.FormValue(key)
		if val, err := strconv.ParseUint(valStr, 10, 32); err == nil {
			uintVal := uint(val)
			return &uintVal
		}
		return nil
	}
	parseFloat := func(key string) *float64 {
		valStr := c.FormValue(key)
		if val, err := strconv.ParseFloat(valStr, 64); err == nil {
			return &val
		}
		return nil
	}
	parseString := func(key string) *string {
		val := c.FormValue(key)
		if val != "" {
			return &val
		}
		return nil
	}
	parseBool := func(key string) *bool {
		valStr := c.FormValue(key)
		if val, err := strconv.ParseBool(valStr); err == nil {
			return &val
		}
		return nil
	}

	// --- Map all fields from form to the model ---
	report.DoctorID = parseUint("doctorId")
	report.CurrentHeartRate = parseInt("currentHeartRate")
	report.CurrentRhythm = parseString("currentRhythm")
	report.CurrentDependency = parseString("currentDependency")
	report.MdcIdcStatAtafBurdenPercent = parseFloat("mdc_idc_stat_ataf_burden_percent")
	report.QrsDuration = parseFloat("qrs_duration")
	report.MdcIdcSetBradyMode = parseString("mdc_idc_set_brady_mode")
	report.MdcIdcSetBradyLowrate = parseInt("mdc_idc_set_brady_lowrate")
	report.MdcIdcSetBradyMaxTrackingRate = parseInt("mdc_idc_set_brady_max_tracking_rate")
	report.MdcIdcSetBradyMaxSensorRate = parseInt("mdc_idc_set_brady_max_sensor_rate")
	report.MdcIdcDevSav = parseString("mdc_idc_dev_sav")
	report.MdcIdcDevPav = parseString("mdc_idc_dev_pav")
	report.MdcIdcStatBradyRaPercentPaced = parseFloat("mdc_idc_stat_brady_ra_percent_paced")
	report.MdcIdcStatBradyRvPercentPaced = parseFloat("mdc_idc_stat_brady_rv_percent_paced")
	report.MdcIdcStatBradyLvPercentPaced = parseFloat("mdc_idc_stat_brady_lv_percent_paced")
	report.MdcIdcStatTachyBivPercentPaced = parseFloat("mdc_idc_stat_tachy_biv_percent_paced")
	report.MdcIdcBattVolt = parseFloat("mdc_idc_batt_volt")
	report.MdcIdcBattRemaining = parseFloat("mdc_idc_batt_remaining")
	report.MdcIdcBattPercentage = parseFloat("mdc_idc_batt_percentage")
	report.MdcIdcBattStatus = parseString("mdc_idc_batt_status")
	report.MdcIdcCapChargeTime = parseFloat("mdc_idc_cap_charge_time")
	report.MdcIdcMsmtRaImpedanceMean = parseFloat("mdc_idc_msmt_ra_impedance_mean")
	report.MdcIdcMsmtRaSensing = parseFloat("mdc_idc_msmt_ra_sensing")
	report.MdcIdcMsmtRaPacingThreshold = parseFloat("mdc_idc_msmt_ra_pacing_threshold")
	report.MdcIdcMsmtRaPw = parseFloat("mdc_idc_msmt_ra_pw")
	report.MdcIdcMsmtRvImpedanceMean = parseFloat("mdc_idc_msmt_rv_impedance_mean")
	report.MdcIdcMsmtRvSensing = parseFloat("mdc_idc_msmt_rv_sensing")
	report.MdcIdcMsmtRvPacingThreshold = parseFloat("mdc_idc_msmt_rv_pacing_threshold")
	report.MdcIdcMsmtRvPw = parseFloat("mdc_idc_msmt_rv_pw")
	report.MdcIdcMsmtShockImpedance = parseFloat("mdc_idc_msmt_shock_impedance")
	report.MdcIdcMsmtLvImpedanceMean = parseFloat("mdc_idc_msmt_lv_impedance_mean")
	report.MdcIdcMsmtLvSensing = parseFloat("mdc_idc_msmt_lv_sensing")
	report.MdcIdcMsmtLvPacingThreshold = parseFloat("mdc_idc_msmt_lv_pacing_threshold")
	report.MdcIdcMsmtLvPw = parseFloat("mdc_idc_msmt_lv_pw")
	report.Comments = parseString("comments")
	report.IsCompleted = parseBool("isCompleted")

	// Parse arrhythmias from JSON string in form data
	arrhythmiasJSON := c.FormValue("arrhythmias")
	if arrhythmiasJSON != "" {
		var arrhythmias []models.Arrhythmia
		if err := json.Unmarshal([]byte(arrhythmiasJSON), &arrhythmias); err == nil {
			report.Arrhythmias = arrhythmias
		} else {
			log.Printf("Warning: could not unmarshal arrhythmias JSON: %v", err)
		}
	}

	// Parse tags from JSON string in form data (expecting array of Tag IDs)
	tagsJSON := c.FormValue("tags")
	if tagsJSON != "" {
		var tagIDs []uint
		if err := json.Unmarshal([]byte(tagsJSON), &tagIDs); err == nil && len(tagIDs) > 0 {
			var tags []models.Tag
			if err := config.DB.Where("id IN ?", tagIDs).Find(&tags).Error; err == nil {
				report.Tags = tags
			} else {
				log.Printf("Warning: could not fetch tags: %v", err)
			}
		} else {
			log.Printf("Warning: could not unmarshal tags JSON: %v", err)
		}
	}

	// Get file paths from the UploadFile middleware (if a file was uploaded)
	if filePath, ok := c.Locals("filePath").(string); ok {
		report.FilePath = &filePath
	}
	if fileUrl, ok := c.Locals("fileUrl").(string); ok {
		report.FileUrl = &fileUrl
	}

	return &report, nil
}

// CreateReport creates a new report with a potential file upload
func CreateReport(c *fiber.Ctx) error {
	report, err := parseReportForm(c)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Save the report to the database
	if err := config.DB.Create(&report).Error; err != nil {
		log.Printf("Error creating report: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create report"})
	}

	// Fetch the full report again to ensure all associations are loaded for the response
	createdReport, err := models.GetReportByID(report.ID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch created report data"})
	}

	// Trigger webhooks for report creation
	TriggerWebhook(models.EventReportCreated, map[string]interface{}{
		"reportId":     createdReport.ID,
		"patientId":    createdReport.PatientID,
		"reportType":   createdReport.ReportType,
		"reportStatus": createdReport.ReportStatus,
		"reportDate":   createdReport.ReportDate,
	})

	// Check for battery alerts
	if createdReport.MdcIdcBattStatus != nil {
		battStatus := *createdReport.MdcIdcBattStatus
		if battStatus == "ERI" || battStatus == "EOL" {
			TriggerWebhook(models.EventBatteryCritical, map[string]interface{}{
				"reportId":          createdReport.ID,
				"patientId":         createdReport.PatientID,
				"batteryStatus":     battStatus,
				"batteryVoltage":    createdReport.MdcIdcBattVolt,
				"batteryPercentage": createdReport.MdcIdcBattPercentage,
			})
		}
	}

	// Check for low battery percentage
	if createdReport.MdcIdcBattPercentage != nil && *createdReport.MdcIdcBattPercentage < 20 {
		TriggerWebhook(models.EventBatteryLow, map[string]interface{}{
			"reportId":          createdReport.ID,
			"patientId":         createdReport.PatientID,
			"batteryPercentage": *createdReport.MdcIdcBattPercentage,
			"batteryVoltage":    createdReport.MdcIdcBattVolt,
		})
	}

	return c.Status(http.StatusCreated).JSON(toReportResponse(*createdReport))
}

// UpdateReport updates an existing report with a potential file upload
func UpdateReport(c *fiber.Ctx) error {
	reportID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid report ID format"})
	}

	// Fetch existing report
	existingReport, err := models.GetReportByID(uint(reportID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Report not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve report"})
	}

	// Parse the incoming form data
	updatedData, err := parseReportForm(c)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Start transaction
	tx := config.DB.Begin()

	// If a new file was uploaded, update the path. Otherwise, keep the old one.
	if updatedData.FilePath != nil {
		// Optional: Delete the old file from storage
		if existingReport.FilePath != nil && *existingReport.FilePath != "" {
			if err := os.Remove(*existingReport.FilePath); err != nil {
				log.Printf("Warning: failed to delete old report file %s: %v", *existingReport.FilePath, err)
			}
		}
		existingReport.FilePath = updatedData.FilePath
		existingReport.FileUrl = updatedData.FileUrl
	}

	// Update all fields on the existing report model
	existingReport.PatientID = updatedData.PatientID
	existingReport.DoctorID = updatedData.DoctorID
	existingReport.ReportDate = updatedData.ReportDate
	existingReport.ReportType = updatedData.ReportType
	existingReport.ReportStatus = updatedData.ReportStatus
	existingReport.CurrentHeartRate = updatedData.CurrentHeartRate
	existingReport.CurrentRhythm = updatedData.CurrentRhythm
	existingReport.CurrentDependency = updatedData.CurrentDependency
	existingReport.MdcIdcStatAtafBurdenPercent = updatedData.MdcIdcStatAtafBurdenPercent
	existingReport.QrsDuration = updatedData.QrsDuration
	existingReport.MdcIdcSetBradyMode = updatedData.MdcIdcSetBradyMode
	existingReport.MdcIdcSetBradyLowrate = updatedData.MdcIdcSetBradyLowrate
	existingReport.MdcIdcSetBradyMaxTrackingRate = updatedData.MdcIdcSetBradyMaxTrackingRate
	existingReport.MdcIdcSetBradyMaxSensorRate = updatedData.MdcIdcSetBradyMaxSensorRate
	existingReport.MdcIdcDevSav = updatedData.MdcIdcDevSav
	existingReport.MdcIdcDevPav = updatedData.MdcIdcDevPav
	existingReport.MdcIdcStatBradyRaPercentPaced = updatedData.MdcIdcStatBradyRaPercentPaced
	existingReport.MdcIdcStatBradyRvPercentPaced = updatedData.MdcIdcStatBradyRvPercentPaced
	existingReport.MdcIdcStatBradyLvPercentPaced = updatedData.MdcIdcStatBradyLvPercentPaced
	existingReport.MdcIdcStatTachyBivPercentPaced = updatedData.MdcIdcStatTachyBivPercentPaced
	existingReport.MdcIdcBattVolt = updatedData.MdcIdcBattVolt
	existingReport.MdcIdcBattRemaining = updatedData.MdcIdcBattRemaining
	existingReport.MdcIdcBattPercentage = updatedData.MdcIdcBattPercentage
	existingReport.MdcIdcBattStatus = updatedData.MdcIdcBattStatus
	existingReport.MdcIdcCapChargeTime = updatedData.MdcIdcCapChargeTime
	existingReport.MdcIdcMsmtRaImpedanceMean = updatedData.MdcIdcMsmtRaImpedanceMean
	existingReport.MdcIdcMsmtRaSensing = updatedData.MdcIdcMsmtRaSensing
	existingReport.MdcIdcMsmtRaPacingThreshold = updatedData.MdcIdcMsmtRaPacingThreshold
	existingReport.MdcIdcMsmtRaPw = updatedData.MdcIdcMsmtRaPw
	existingReport.MdcIdcMsmtRvImpedanceMean = updatedData.MdcIdcMsmtRvImpedanceMean
	existingReport.MdcIdcMsmtRvSensing = updatedData.MdcIdcMsmtRvSensing
	existingReport.MdcIdcMsmtRvPacingThreshold = updatedData.MdcIdcMsmtRvPacingThreshold
	existingReport.MdcIdcMsmtRvPw = updatedData.MdcIdcMsmtRvPw
	existingReport.MdcIdcMsmtShockImpedance = updatedData.MdcIdcMsmtShockImpedance
	existingReport.MdcIdcMsmtLvImpedanceMean = updatedData.MdcIdcMsmtLvImpedanceMean
	existingReport.MdcIdcMsmtLvSensing = updatedData.MdcIdcMsmtLvSensing
	existingReport.MdcIdcMsmtLvPacingThreshold = updatedData.MdcIdcMsmtLvPacingThreshold
	existingReport.MdcIdcMsmtLvPw = updatedData.MdcIdcMsmtLvPw
	existingReport.Comments = updatedData.Comments
	existingReport.IsCompleted = updatedData.IsCompleted

	// Replace arrhythmias
	if err := tx.Where("report_id = ?", reportID).Delete(&models.Arrhythmia{}).Error; err != nil {
		tx.Rollback()
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update arrhythmias"})
	}
	existingReport.Arrhythmias = updatedData.Arrhythmias

	// Update Tags association
	if err := tx.Model(&existingReport).Association("Tags").Replace(updatedData.Tags); err != nil {
		tx.Rollback()
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update tags"})
	}

	// Save the updated report and its new associations
	if err := tx.Session(&gorm.Session{FullSaveAssociations: true}).Save(&existingReport).Error; err != nil {
		tx.Rollback()
		log.Printf("Error updating report: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update report"})
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to commit transaction"})
	}

	// Fetch the full report again to ensure all data is fresh
	finalReport, err := models.GetReportByID(uint(reportID))
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch updated report data"})
	}

	return c.Status(http.StatusOK).JSON(toReportResponse(*finalReport))
}

// GetReportsByPatient retrieves all reports for a specific patient
func GetReportsByPatient(c *fiber.Ctx) error {
	patientID, err := strconv.ParseUint(c.Params("patientId"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patient ID format"})
	}

	reports, err := models.GetReportsByPatientID(uint(patientID))
	if err != nil {
		log.Printf("Error fetching reports for patient %d: %v", patientID, err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch reports"})
	}

	var reportResponses []ReportResponse
	for _, report := range reports {
		reportResponses = append(reportResponses, toReportResponse(report))
	}

	return c.JSON(reportResponses)
}

// GetRecentReports returns the newest reports across all patients.
func GetRecentReports(c *fiber.Ctx) error {
	limitStr := c.Query("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 10
	}
	reports, err := models.GetRecentReports(limit)
	if err != nil {
		log.Printf("Error fetching recent reports: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch recent reports"})
	}

	items := make([]RecentReportItem, 0, len(reports))
	for _, r := range reports {
		var item RecentReportItem
		item.ID = r.ID
		item.ReportDate = r.ReportDate
		item.ReportType = r.ReportType
		item.ReportStatus = r.ReportStatus
		item.Patient = struct {
			ID        uint   `json:"id"`
			LastName  string `json:"fname"`
			FirstName string `json:"lname"`
			MRN       string `json:"mrn"`
		}{
			ID:        r.PatientID,
			LastName:  r.Patient.LastName,
			FirstName: r.Patient.FirstName,
			MRN:       fmt.Sprintf("%v", r.Patient.MRN),
		}
		// Best-effort createdBy from User
		if r.User.ID != 0 && r.User.Username != "" {
			item.CreatedBy = r.User.Username
		} else if r.UserID != 0 {
			item.CreatedBy = fmt.Sprintf("User #%d", r.UserID)
		}
		items = append(items, item)
	}

	return c.JSON(items)
}

// GetReport handles the request for retrieving a single report
func GetReport(c *fiber.Ctx) error {
	reportID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid report ID format"})
	}

	report, err := models.GetReportByID(uint(reportID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Report not found"})
		}
		log.Printf("Error fetching report %d: %v", reportID, err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch report"})
	}

	return c.JSON(toReportResponse(*report))
}

// DeleteReport handles the request for deleting a report
func DeleteReport(c *fiber.Ctx) error {
	reportID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid report ID format"})
	}

	// Check if report exists before deleting
	report, err := models.GetReportByID(uint(reportID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Report not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve report for deletion"})
	}

	// Delete the associated file from storage if it exists
	if report.FilePath != nil && *report.FilePath != "" {
		if err := os.Remove(*report.FilePath); err != nil {
			log.Printf("Warning: failed to delete report file %s: %v", *report.FilePath, err)
		}
	}

	if err := models.DeleteReport(uint(reportID)); err != nil {
		log.Printf("Error deleting report %d: %v", reportID, err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete report"})
	}

	return c.SendStatus(http.StatusNoContent)
}
