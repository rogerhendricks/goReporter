package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/rogerhendricks/goReporter/internal/security"
	"github.com/rogerhendricks/goReporter/internal/services"
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
	ID                                             uint                 `json:"id"`
	PatientID                                      uint                 `json:"patientId"`
	UserID                                         uint                 `json:"userId"`
	DoctorID                                       *uint                `json:"doctorId"`
	CompletedByUserID                              *uint                `json:"completedByUserId"`
	CompletedByName                                *string              `json:"completedByName"`
	CompletedBySignature                           *string              `json:"completedBySignature"`
	ReportDate                                     time.Time            `json:"reportDate"`
	ReportType                                     string               `json:"reportType"`
	ReportStatus                                   string               `json:"reportStatus"`
	CurrentHeartRate                               *int                 `json:"currentHeartRate"`
	CurrentRhythm                                  *string              `json:"currentRhythm"`
	CurrentDependency                              *string              `json:"currentDependency"`
	MdcIdcStatAtafBurdenPercent                    *float64             `json:"mdc_idc_stat_ataf_burden_percent"`
	QrsDuration                                    *float64             `json:"qrs_duration"`
	EpisodeAfCountSinceLastCheck                   *int                 `json:"episode_af_count_since_last_check"`
	EpisodeTachyCountSinceLastCheck                *int                 `json:"episode_tachy_count_since_last_check"`
	EpisodePauseCountSinceLastCheck                *int                 `json:"episode_pause_count_since_last_check"`
	EpisodeSymptomAllCountSinceLastCheck           *int                 `json:"episode_symptom_all_count_since_last_check"`
	EpisodeSymptomWithDetectionCountSinceLastCheck *int                 `json:"episode_symptom_with_detection_count_since_last_check"`
	MdcIdcSetBradyMode                             *string              `json:"mdc_idc_set_brady_mode"`
	MdcIdcSetBradyLowrate                          *int                 `json:"mdc_idc_set_brady_lowrate"`
	MdcIdcSetBradyMaxTrackingRate                  *int                 `json:"mdc_idc_set_brady_max_tracking_rate"`
	MdcIdcSetBradyMaxSensorRate                    *int                 `json:"mdc_idc_set_brady_max_sensor_rate"`
	MdcIdcDevSav                                   *string              `json:"mdc_idc_dev_sav"`
	MdcIdcDevPav                                   *string              `json:"mdc_idc_dev_pav"`
	MdcIdcStatBradyRaPercentPaced                  *float64             `json:"mdc_idc_stat_brady_ra_percent_paced"`
	MdcIdcStatBradyRvPercentPaced                  *float64             `json:"mdc_idc_stat_brady_rv_percent_paced"`
	MdcIdcStatBradyLvPercentPaced                  *float64             `json:"mdc_idc_stat_brady_lv_percent_paced"`
	MdcIdcStatBradyBivPercentPaced                 *float64             `json:"mdc_idc_stat_brady_biv_percent_paced"`
	MdcIdcBattVolt                                 *float64             `json:"mdc_idc_batt_volt"`
	MdcIdcBattRemaining                            *float64             `json:"mdc_idc_batt_remaining"`
	MdcIdcBattPercentage                           *float64             `json:"mdc_idc_batt_percentage"`
	MdcIdcBattStatus                               *string              `json:"mdc_idc_batt_status"`
	MdcIdcCapChargeTime                            *float64             `json:"mdc_idc_cap_charge_time"`
	MdcIdcMsmtRaImpedanceMean                      *float64             `json:"mdc_idc_msmt_ra_impedance_mean"`
	MdcIdcMsmtRaSensing                            *float64             `json:"mdc_idc_msmt_ra_sensing"`
	MdcIdcMsmtRaPacingThreshold                    *float64             `json:"mdc_idc_msmt_ra_pacing_threshold"`
	MdcIdcMsmtRaPw                                 *float64             `json:"mdc_idc_msmt_ra_pw"`
	MdcIdcMsmtRvImpedanceMean                      *float64             `json:"mdc_idc_msmt_rv_impedance_mean"`
	MdcIdcMsmtRvSensing                            *float64             `json:"mdc_idc_msmt_rv_sensing"`
	MdcIdcMsmtRvPacingThreshold                    *float64             `json:"mdc_idc_msmt_rv_pacing_threshold"`
	MdcIdcMsmtRvPw                                 *float64             `json:"mdc_idc_msmt_rv_pw"`
	MdcIdcMsmtHvImpedanceMean                      *float64             `json:"mdc_idc_msmt_hv_impedance_mean"`
	MdcIdcMsmtLvImpedanceMean                      *float64             `json:"mdc_idc_msmt_lv_impedance_mean"`
	MdcIdcMsmtLvSensing                            *float64             `json:"mdc_idc_msmt_lv_sensing"`
	MdcIdcMsmtLvPacingThreshold                    *float64             `json:"mdc_idc_msmt_lv_pacing_threshold"`
	MdcIdcMsmtLvPw                                 *float64             `json:"mdc_idc_msmt_lv_pw"`
	Vt1Active                                      *string              `json:"VT1_active"`
	Vt1DetectionInterval                           *string              `json:"VT1_detection_interval"`
	Vt1Therapy1Atp                                 *string              `json:"VT1_therapy_1_atp"`
	Vt1Therapy1NoBursts                            *string              `json:"VT1_therapy_1_no_bursts"`
	Vt1Therapy2Atp                                 *string              `json:"VT1_therapy_2_atp"`
	Vt1Therapy2NoBursts                            *string              `json:"VT1_therapy_2_no_bursts"`
	Vt1Therapy3Cvrt                                *string              `json:"VT1_therapy_3_cvrt"`
	Vt1Therapy3Energy                              *string              `json:"VT1_therapy_3_energy"`
	Vt1Therapy4Cvrt                                *string              `json:"VT1_therapy_4_cvrt"`
	Vt1Therapy4Energy                              *string              `json:"VT1_therapy_4_energy"`
	Vt1Therapy5Cvrt                                *string              `json:"VT1_therapy_5_cvrt"`
	Vt1Therapy5Energy                              *string              `json:"VT1_therapy_5_energy"`
	Vt1Therapy5MaxNumShocks                        *string              `json:"VT1_therapy_5_max_num_shocks"`
	Vt2Active                                      *string              `json:"VT2_active"`
	Vt2DetectionInterval                           *string              `json:"VT2_detection_interval"`
	Vt2Therapy1Atp                                 *string              `json:"VT2_therapy_1_atp"`
	Vt2Therapy1NoBursts                            *string              `json:"VT2_therapy_1_no_bursts"`
	Vt2Therapy2Atp                                 *string              `json:"VT2_therapy_2_atp"`
	Vt2Therapy2NoBursts                            *string              `json:"VT2_therapy_2_no_bursts"`
	Vt2Therapy3Cvrt                                *string              `json:"VT2_therapy_3_cvrt"`
	Vt2Therapy3Energy                              *string              `json:"VT2_therapy_3_energy"`
	Vt2Therapy4Cvrt                                *string              `json:"VT2_therapy_4_cvrt"`
	Vt2Therapy4Energy                              *string              `json:"VT2_therapy_4_energy"`
	Vt2Therapy5Cvrt                                *string              `json:"VT2_therapy_5_cvrt"`
	Vt2Therapy5Energy                              *string              `json:"VT2_therapy_5_energy"`
	Vt2Therapy5MaxNumShocks                        *string              `json:"VT2_therapy_5_max_num_shocks"`
	VfActive                                       *string              `json:"VF_active"`
	VfDetectionInterval                            *string              `json:"VF_detection_interval"`
	VfTherapy1Atp                                  *string              `json:"VF_therapy_1_atp"`
	VfTherapy1NoBursts                             *string              `json:"VF_therapy_1_no_bursts"`
	VfTherapy2Energy                               *string              `json:"VF_therapy_2_energy"`
	VfTherapy3Energy                               *string              `json:"VF_therapy_3_energy"`
	VfTherapy4Energy                               *string              `json:"VF_therapy_4_energy"`
	VfTherapy4MaxNumShocks                         *string              `json:"VF_therapy_4_max_num_shocks"`
	Comments                                       *string              `json:"comments"`
	IsCompleted                                    *bool                `json:"isCompleted"`
	FilePath                                       *string              `json:"file_path"`
	FileUrl                                        *string              `json:"file_url"`
	Arrhythmias                                    []ArrhythmiaResponse `json:"arrhythmias"`
	Tags                                           []models.Tag         `json:"tags"`
	CreatedAt                                      time.Time            `json:"createdAt"`
	UpdatedAt                                      time.Time            `json:"updatedAt"`
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

// normalizeDateOnly strips any time/zone component and returns midnight UTC for date-only fields.
func normalizeDateOnly(t time.Time) time.Time {
	// Preserve the calendar date as supplied (including its offset) and store at midnight UTC.
	// This avoids shifting a user-selected date (e.g., 18th local) back to the previous day
	// when converting to UTC.
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

// toReportResponse converts a Report model to a ReportResponse DTO
func toReportResponse(report models.Report) ReportResponse {
	resp := ReportResponse{
		ID:                                   report.ID,
		PatientID:                            report.PatientID,
		UserID:                               report.UserID,
		DoctorID:                             report.DoctorID,
		CompletedByUserID:                    report.CompletedByUserID,
		CompletedByName:                      report.CompletedByName,
		CompletedBySignature:                 report.CompletedBySignature,
		ReportDate:                           report.ReportDate,
		ReportType:                           report.ReportType,
		ReportStatus:                         report.ReportStatus,
		CurrentHeartRate:                     report.CurrentHeartRate,
		CurrentRhythm:                        report.CurrentRhythm,
		CurrentDependency:                    report.CurrentDependency,
		MdcIdcStatAtafBurdenPercent:          report.MdcIdcStatAtafBurdenPercent,
		QrsDuration:                          report.QrsDuration,
		EpisodeAfCountSinceLastCheck:         report.EpisodeAfCountSinceLastCheck,
		EpisodeTachyCountSinceLastCheck:      report.EpisodeTachyCountSinceLastCheck,
		EpisodePauseCountSinceLastCheck:      report.EpisodePauseCountSinceLastCheck,
		EpisodeSymptomAllCountSinceLastCheck: report.EpisodeSymptomAllCountSinceLastCheck,
		EpisodeSymptomWithDetectionCountSinceLastCheck: report.EpisodeSymptomWithDetectionCountSinceLastCheck,
		MdcIdcSetBradyMode:             report.MdcIdcSetBradyMode,
		MdcIdcSetBradyLowrate:          report.MdcIdcSetBradyLowrate,
		MdcIdcSetBradyMaxTrackingRate:  report.MdcIdcSetBradyMaxTrackingRate,
		MdcIdcSetBradyMaxSensorRate:    report.MdcIdcSetBradyMaxSensorRate,
		MdcIdcDevSav:                   report.MdcIdcDevSav,
		MdcIdcDevPav:                   report.MdcIdcDevPav,
		MdcIdcStatBradyRaPercentPaced:  report.MdcIdcStatBradyRaPercentPaced,
		MdcIdcStatBradyRvPercentPaced:  report.MdcIdcStatBradyRvPercentPaced,
		MdcIdcStatBradyLvPercentPaced:  report.MdcIdcStatBradyLvPercentPaced,
		MdcIdcStatBradyBivPercentPaced: report.MdcIdcStatBradyBivPercentPaced,
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
		MdcIdcMsmtHvImpedanceMean:      report.MdcIdcMsmtHvImpedanceMean,
		MdcIdcMsmtLvImpedanceMean:      report.MdcIdcMsmtLvImpedanceMean,
		MdcIdcMsmtLvSensing:            report.MdcIdcMsmtLvSensing,
		MdcIdcMsmtLvPacingThreshold:    report.MdcIdcMsmtLvPacingThreshold,
		MdcIdcMsmtLvPw:                 report.MdcIdcMsmtLvPw,
		Vt1Active:                      report.Vt1Active,
		Vt1DetectionInterval:           report.Vt1DetectionInterval,
		Vt1Therapy1Atp:                 report.Vt1Therapy1Atp,
		Vt1Therapy1NoBursts:            report.Vt1Therapy1NoBursts,
		Vt1Therapy2Atp:                 report.Vt1Therapy2Atp,
		Vt1Therapy2NoBursts:            report.Vt1Therapy2NoBursts,
		Vt1Therapy3Cvrt:                report.Vt1Therapy3Cvrt,
		Vt1Therapy3Energy:              report.Vt1Therapy3Energy,
		Vt1Therapy4Cvrt:                report.Vt1Therapy4Cvrt,
		Vt1Therapy4Energy:              report.Vt1Therapy4Energy,
		Vt1Therapy5Cvrt:                report.Vt1Therapy5Cvrt,
		Vt1Therapy5Energy:              report.Vt1Therapy5Energy,
		Vt1Therapy5MaxNumShocks:        report.Vt1Therapy5MaxNumShocks,
		Vt2Active:                      report.Vt2Active,
		Vt2DetectionInterval:           report.Vt2DetectionInterval,
		Vt2Therapy1Atp:                 report.Vt2Therapy1Atp,
		Vt2Therapy1NoBursts:            report.Vt2Therapy1NoBursts,
		Vt2Therapy2Atp:                 report.Vt2Therapy2Atp,
		Vt2Therapy2NoBursts:            report.Vt2Therapy2NoBursts,
		Vt2Therapy3Cvrt:                report.Vt2Therapy3Cvrt,
		Vt2Therapy3Energy:              report.Vt2Therapy3Energy,
		Vt2Therapy4Cvrt:                report.Vt2Therapy4Cvrt,
		Vt2Therapy4Energy:              report.Vt2Therapy4Energy,
		Vt2Therapy5Cvrt:                report.Vt2Therapy5Cvrt,
		Vt2Therapy5Energy:              report.Vt2Therapy5Energy,
		Vt2Therapy5MaxNumShocks:        report.Vt2Therapy5MaxNumShocks,
		VfActive:                       report.VfActive,
		VfDetectionInterval:            report.VfDetectionInterval,
		VfTherapy1Atp:                  report.VfTherapy1Atp,
		VfTherapy1NoBursts:             report.VfTherapy1NoBursts,
		VfTherapy2Energy:               report.VfTherapy2Energy,
		VfTherapy3Energy:               report.VfTherapy3Energy,
		VfTherapy4Energy:               report.VfTherapy4Energy,
		VfTherapy4MaxNumShocks:         report.VfTherapy4MaxNumShocks,
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
	// Ensure we store date-only at midnight UTC to avoid timezone shifts from client to server.
	reportDate = normalizeDateOnly(reportDate)

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
	report.EpisodeAfCountSinceLastCheck = parseInt("episode_af_count_since_last_check")
	report.EpisodeTachyCountSinceLastCheck = parseInt("episode_tachy_count_since_last_check")
	report.EpisodePauseCountSinceLastCheck = parseInt("episode_pause_count_since_last_check")
	report.EpisodeSymptomAllCountSinceLastCheck = parseInt("episode_symptom_all_count_since_last_check")
	report.EpisodeSymptomWithDetectionCountSinceLastCheck = parseInt("episode_symptom_with_detection_count_since_last_check")
	report.MdcIdcSetBradyMode = parseString("mdc_idc_set_brady_mode")
	report.MdcIdcSetBradyLowrate = parseInt("mdc_idc_set_brady_lowrate")
	report.MdcIdcSetBradyMaxTrackingRate = parseInt("mdc_idc_set_brady_max_tracking_rate")
	report.MdcIdcSetBradyMaxSensorRate = parseInt("mdc_idc_set_brady_max_sensor_rate")
	report.MdcIdcDevSav = parseString("mdc_idc_dev_sav")
	report.MdcIdcDevPav = parseString("mdc_idc_dev_pav")
	report.MdcIdcStatBradyRaPercentPaced = parseFloat("mdc_idc_stat_brady_ra_percent_paced")
	report.MdcIdcStatBradyRvPercentPaced = parseFloat("mdc_idc_stat_brady_rv_percent_paced")
	report.MdcIdcStatBradyLvPercentPaced = parseFloat("mdc_idc_stat_brady_lv_percent_paced")
	report.MdcIdcStatBradyBivPercentPaced = parseFloat("mdc_idc_stat_brady_biv_percent_paced")
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
	report.MdcIdcMsmtHvImpedanceMean = parseFloat("mdc_idc_msmt_hv_impedance_mean")
	report.MdcIdcMsmtLvImpedanceMean = parseFloat("mdc_idc_msmt_lv_impedance_mean")
	report.MdcIdcMsmtLvSensing = parseFloat("mdc_idc_msmt_lv_sensing")
	report.MdcIdcMsmtLvPacingThreshold = parseFloat("mdc_idc_msmt_lv_pacing_threshold")
	report.MdcIdcMsmtLvPw = parseFloat("mdc_idc_msmt_lv_pw")
	report.Vt1Active = parseString("VT1_active")
	report.Vt1DetectionInterval = parseString("VT1_detection_interval")
	report.Vt1Therapy1Atp = parseString("VT1_therapy_1_atp")
	report.Vt1Therapy1NoBursts = parseString("VT1_therapy_1_no_bursts")
	report.Vt1Therapy2Atp = parseString("VT1_therapy_2_atp")
	report.Vt1Therapy2NoBursts = parseString("VT1_therapy_2_no_bursts")
	report.Vt1Therapy3Cvrt = parseString("VT1_therapy_3_cvrt")
	report.Vt1Therapy3Energy = parseString("VT1_therapy_3_energy")
	report.Vt1Therapy4Cvrt = parseString("VT1_therapy_4_cvrt")
	report.Vt1Therapy4Energy = parseString("VT1_therapy_4_energy")
	report.Vt1Therapy5Cvrt = parseString("VT1_therapy_5_cvrt")
	report.Vt1Therapy5Energy = parseString("VT1_therapy_5_energy")
	report.Vt1Therapy5MaxNumShocks = parseString("VT1_therapy_5_max_num_shocks")
	report.Vt2Active = parseString("VT2_active")
	report.Vt2DetectionInterval = parseString("VT2_detection_interval")
	report.Vt2Therapy1Atp = parseString("VT2_therapy_1_atp")
	report.Vt2Therapy1NoBursts = parseString("VT2_therapy_1_no_bursts")
	report.Vt2Therapy2Atp = parseString("VT2_therapy_2_atp")
	report.Vt2Therapy2NoBursts = parseString("VT2_therapy_2_no_bursts")
	report.Vt2Therapy3Cvrt = parseString("VT2_therapy_3_cvrt")
	report.Vt2Therapy3Energy = parseString("VT2_therapy_3_energy")
	report.Vt2Therapy4Cvrt = parseString("VT2_therapy_4_cvrt")
	report.Vt2Therapy4Energy = parseString("VT2_therapy_4_energy")
	report.Vt2Therapy5Cvrt = parseString("VT2_therapy_5_cvrt")
	report.Vt2Therapy5Energy = parseString("VT2_therapy_5_energy")
	report.Vt2Therapy5MaxNumShocks = parseString("VT2_therapy_5_max_num_shocks")
	report.VfActive = parseString("VF_active")
	report.VfDetectionInterval = parseString("VF_detection_interval")
	report.VfTherapy1Atp = parseString("VF_therapy_1_atp")
	report.VfTherapy1NoBursts = parseString("VF_therapy_1_no_bursts")
	report.VfTherapy2Energy = parseString("VF_therapy_2_energy")
	report.VfTherapy3Energy = parseString("VF_therapy_3_energy")
	report.VfTherapy4Energy = parseString("VF_therapy_4_energy")
	report.VfTherapy4MaxNumShocks = parseString("VF_therapy_4_max_num_shocks")
	report.Comments = parseString("comments")
	report.IsCompleted = parseBool("isCompleted")
	report.CompletedByName = parseString("completedByName")
	report.CompletedBySignature = parseString("completedBySignature")

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

	userRole, _ := c.Locals("userRole").(string)
	user, _ := c.Locals("user").(*models.User)
	allowedCompleter := userRole == "staff_doctor" || userRole == "admin"

	if report.IsCompleted != nil && *report.IsCompleted {
		if !allowedCompleter {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Only staff doctors or admins can mark reports completed"})
		}

		if user != nil {
			if report.CompletedByUserID == nil {
				report.CompletedByUserID = &user.ID
			}
			if report.CompletedByName == nil {
				name := user.FullName
				if name == "" {
					name = user.Username
				}
				report.CompletedByName = &name
			}
		}

		if userRole == "admin" {
			report.CompletedBySignature = nil // Admins do not provide signatures
		}
	} else {
		report.CompletedByUserID = nil
		report.CompletedByName = nil
		report.CompletedBySignature = nil
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

	// Check if report is being created as completed
	if createdReport.IsCompleted != nil && *createdReport.IsCompleted {
		// Load patient data for MRN
		var patient models.Patient
		if err := config.DB.First(&patient, createdReport.PatientID).Error; err == nil {
			// Load device information if available
			var implantedDevice models.ImplantedDevice
			deviceInfo := map[string]interface{}{}
			if err := config.DB.Preload("Device").Where("patient_id = ? AND status = ?", patient.ID, "Active").Order("implanted_at DESC").First(&implantedDevice).Error; err == nil {
				deviceInfo["deviceType"] = implantedDevice.Device.Type
				deviceInfo["deviceSerial"] = implantedDevice.Serial
				deviceInfo["deviceManufacturer"] = implantedDevice.Device.Manufacturer
				deviceInfo["deviceModel"] = implantedDevice.Device.Model
			}

			TriggerWebhook(models.EventReportCompleted, map[string]interface{}{
				"reportId":            createdReport.ID,
				"patientId":           createdReport.PatientID,
				"patientMRN":          patient.MRN,
				"patientName":         fmt.Sprintf("%s %s", patient.FirstName, patient.LastName),
				"reportDate":          createdReport.ReportDate.Format(time.RFC3339),
				"reportType":          createdReport.ReportType,
				"reportStatus":        createdReport.ReportStatus,
				"reportUrl":           getReportURL(createdReport.ID),
				"batteryStatus":       getStringPointer(createdReport.MdcIdcBattStatus),
				"batteryPercentage":   getFloatPointer(createdReport.MdcIdcBattPercentage),
				"batteryVoltage":      getFloatPointer(createdReport.MdcIdcBattVolt),
				"atrialPacing":        getFloatPointer(createdReport.MdcIdcStatBradyRaPercentPaced),
				"ventricularPacing":   getFloatPointer(createdReport.MdcIdcStatBradyRvPercentPaced),
				"biventricularPacing": getFloatPointer(createdReport.MdcIdcStatBradyBivPercentPaced),
				"device":              deviceInfo,
			})

			// Notify admins (in-app) when report is created as completed.
			username, _ := c.Locals("username").(string)
			reportID := createdReport.ID
			services.NotificationsHub.BroadcastToAdmins(services.NotificationEvent{
				Type:        "report.completed",
				Title:       "Report completed",
				Message:     fmt.Sprintf("%s marked report #%d complete", username, createdReport.ID),
				ReportID:    &reportID,
				CompletedBy: username,
			})
		}
	}

	security.LogEventFromContext(c, security.EventDataModification,
		fmt.Sprintf("User created report: %d", createdReport.ID),
		"INFO",
		map[string]interface{}{"reportId": createdReport.ID, "patientId": createdReport.PatientID},
	)

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

	wasCompleted := existingReport.IsCompleted != nil && *existingReport.IsCompleted

	// Parse the incoming form data
	updatedData, err := parseReportForm(c)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	userRole, _ := c.Locals("userRole").(string)
	user, _ := c.Locals("user").(*models.User)
	allowedCompleter := userRole == "staff_doctor" || userRole == "admin"

	if updatedData.IsCompleted != nil && *updatedData.IsCompleted {
		if !allowedCompleter {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Only staff doctors or admins can mark reports completed"})
		}

		if user != nil {
			updatedData.CompletedByUserID = &user.ID
			if updatedData.CompletedByName == nil {
				name := user.FullName
				if name == "" {
					name = user.Username
				}
				updatedData.CompletedByName = &name
			}
		}

		if userRole == "admin" {
			updatedData.CompletedBySignature = nil // Admins do not provide signatures
		}
	} else {
		updatedData.CompletedByUserID = nil
		updatedData.CompletedByName = nil
		updatedData.CompletedBySignature = nil
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
	existingReport.MdcIdcStatBradyBivPercentPaced = updatedData.MdcIdcStatBradyBivPercentPaced
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
	existingReport.MdcIdcMsmtHvImpedanceMean = updatedData.MdcIdcMsmtHvImpedanceMean
	existingReport.MdcIdcMsmtLvImpedanceMean = updatedData.MdcIdcMsmtLvImpedanceMean
	existingReport.MdcIdcMsmtLvSensing = updatedData.MdcIdcMsmtLvSensing
	existingReport.MdcIdcMsmtLvPacingThreshold = updatedData.MdcIdcMsmtLvPacingThreshold
	existingReport.MdcIdcMsmtLvPw = updatedData.MdcIdcMsmtLvPw
	existingReport.Vt1Active = updatedData.Vt1Active
	existingReport.Vt1DetectionInterval = updatedData.Vt1DetectionInterval
	existingReport.Vt1Therapy1Atp = updatedData.Vt1Therapy1Atp
	existingReport.Vt1Therapy1NoBursts = updatedData.Vt1Therapy1NoBursts
	existingReport.Vt1Therapy2Atp = updatedData.Vt1Therapy2Atp
	existingReport.Vt1Therapy2NoBursts = updatedData.Vt1Therapy2NoBursts
	existingReport.Vt1Therapy3Cvrt = updatedData.Vt1Therapy3Cvrt
	existingReport.Vt1Therapy3Energy = updatedData.Vt1Therapy3Energy
	existingReport.Vt1Therapy4Cvrt = updatedData.Vt1Therapy4Cvrt
	existingReport.Vt1Therapy4Energy = updatedData.Vt1Therapy4Energy
	existingReport.Vt1Therapy5Cvrt = updatedData.Vt1Therapy5Cvrt
	existingReport.Vt1Therapy5Energy = updatedData.Vt1Therapy5Energy
	existingReport.Vt1Therapy5MaxNumShocks = updatedData.Vt1Therapy5MaxNumShocks
	existingReport.Vt2Active = updatedData.Vt2Active
	existingReport.Vt2DetectionInterval = updatedData.Vt2DetectionInterval
	existingReport.Vt2Therapy1Atp = updatedData.Vt2Therapy1Atp
	existingReport.Vt2Therapy1NoBursts = updatedData.Vt2Therapy1NoBursts
	existingReport.Vt2Therapy2Atp = updatedData.Vt2Therapy2Atp
	existingReport.Vt2Therapy2NoBursts = updatedData.Vt2Therapy2NoBursts
	existingReport.Vt2Therapy3Cvrt = updatedData.Vt2Therapy3Cvrt
	existingReport.Vt2Therapy3Energy = updatedData.Vt2Therapy3Energy
	existingReport.Vt2Therapy4Cvrt = updatedData.Vt2Therapy4Cvrt
	existingReport.Vt2Therapy4Energy = updatedData.Vt2Therapy4Energy
	existingReport.Vt2Therapy5Cvrt = updatedData.Vt2Therapy5Cvrt
	existingReport.Vt2Therapy5Energy = updatedData.Vt2Therapy5Energy
	existingReport.Vt2Therapy5MaxNumShocks = updatedData.Vt2Therapy5MaxNumShocks
	existingReport.VfActive = updatedData.VfActive
	existingReport.VfDetectionInterval = updatedData.VfDetectionInterval
	existingReport.VfTherapy1Atp = updatedData.VfTherapy1Atp
	existingReport.VfTherapy1NoBursts = updatedData.VfTherapy1NoBursts
	existingReport.VfTherapy2Energy = updatedData.VfTherapy2Energy
	existingReport.VfTherapy3Energy = updatedData.VfTherapy3Energy
	existingReport.VfTherapy4Energy = updatedData.VfTherapy4Energy
	existingReport.VfTherapy4MaxNumShocks = updatedData.VfTherapy4MaxNumShocks
	existingReport.Comments = updatedData.Comments
	existingReport.IsCompleted = updatedData.IsCompleted
	existingReport.CompletedByUserID = updatedData.CompletedByUserID
	existingReport.CompletedByName = updatedData.CompletedByName
	existingReport.CompletedBySignature = updatedData.CompletedBySignature

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

	// Trigger report.completed webhook if report transitioned to completed
	if updatedData.IsCompleted != nil && *updatedData.IsCompleted && !wasCompleted {
		// Load patient data for MRN
		var patient models.Patient
		if err := config.DB.First(&patient, finalReport.PatientID).Error; err == nil {
			// Load device information if available
			var implantedDevice models.ImplantedDevice
			deviceInfo := map[string]interface{}{}
			if err := config.DB.Preload("Device").Where("patient_id = ? AND status = ?", patient.ID, "Active").Order("implanted_at DESC").First(&implantedDevice).Error; err == nil {
				deviceInfo["deviceType"] = implantedDevice.Device.Type
				deviceInfo["deviceSerial"] = implantedDevice.Serial
				deviceInfo["deviceManufacturer"] = implantedDevice.Device.Manufacturer
				deviceInfo["deviceModel"] = implantedDevice.Device.Model
			}

			TriggerWebhook(models.EventReportCompleted, map[string]interface{}{
				"reportId":           finalReport.ID,
				"patientId":          finalReport.PatientID,
				"patientMRN":         patient.MRN,
				"patientName":        fmt.Sprintf("%s %s", patient.FirstName, patient.LastName),
				"reportDate":         finalReport.ReportDate.Format(time.RFC3339),
				"reportType":         finalReport.ReportType,
				"reportStatus":       finalReport.ReportStatus,
				"reportUrl":          getReportURL(finalReport.ID),
				"batteryStatus":      getStringPointer(finalReport.MdcIdcBattStatus),
				"batteryPercentage":  getFloatPointer(finalReport.MdcIdcBattPercentage),
				"batteryVoltage":     getFloatPointer(finalReport.MdcIdcBattVolt),
				"atrialPacing":       getFloatPointer(finalReport.MdcIdcStatBradyRaPercentPaced),
				"ventricularPacing":  getFloatPointer(finalReport.MdcIdcStatBradyRvPercentPaced),
				"deviceType":         deviceInfo["deviceType"],
				"deviceSerial":       deviceInfo["deviceSerial"],
				"deviceManufacturer": deviceInfo["deviceManufacturer"],
				"deviceModel":        deviceInfo["deviceModel"],
			})

			// Notify admins (in-app) when report becomes completed.
			username, _ := c.Locals("username").(string)
			reportID := finalReport.ID
			services.NotificationsHub.BroadcastToAdmins(services.NotificationEvent{
				Type:        "report.completed",
				Title:       "Report completed",
				Message:     fmt.Sprintf("%s marked report #%d complete", username, finalReport.ID),
				ReportID:    &reportID,
				CompletedBy: username,
			})
		}
	}

	security.LogEventFromContext(c, security.EventDataModification,
		fmt.Sprintf("User updated report: %d", finalReport.ID),
		"INFO",
		map[string]interface{}{"reportId": finalReport.ID, "patientId": finalReport.PatientID},
	)

	return c.Status(http.StatusOK).JSON(toReportResponse(*finalReport))
}

// GetReportsByPatient retrieves all reports for a specific patient
func GetReportsByPatient(c *fiber.Ctx) error {
	patientID, err := strconv.ParseUint(c.Params("patientId"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patient ID format"})
	}

	userRole, _ := c.Locals("userRole").(string)
	userIDVal := c.Locals("user_id")
	userID, ok := userIDVal.(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user session"})
	}

	allowed, accessErr := canAccessPatient(userRole, userID, uint(patientID))
	if accessErr != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify permissions"})
	}
	if !allowed {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	limit := 0
	if limitParam := c.Query("limit", ""); limitParam != "" {
		if parsed, parseErr := strconv.Atoi(limitParam); parseErr == nil && parsed > 0 {
			limit = parsed
		}
	}
	sortField := c.Query("sort", "reportDate")
	order := c.Query("order", "desc")
	includeDeleted := strings.EqualFold(c.Query("includeDeleted", "false"), "true")
	full := strings.EqualFold(c.Query("full", "false"), "true")

	reports, err := models.GetReportsByPatientID(uint(patientID), limit, sortField, order, includeDeleted, full)
	if err != nil {
		log.Printf("Error fetching reports for patient %d: %v", patientID, err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch reports"})
	}

	var reportResponses []ReportResponse
	for _, report := range reports {
		reportResponses = append(reportResponses, toReportResponse(report))
	}

	security.LogEventFromContext(c, security.EventDataAccess,
		fmt.Sprintf("User accessed reports for patient: %d", patientID),
		"INFO",
		map[string]interface{}{"patientId": patientID, "count": len(reports)},
	)

	return c.JSON(reportResponses)
}

// GetRecentReports returns the newest reports across all patients.
func GetRecentReports(c *fiber.Ctx) error {
	limitStr := c.Query("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 10
	}
	incompleteOnly := c.Query("incomplete", "false") == "true"
	offsetStr := c.Query("offset", "0")
	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}

	userRole, _ := c.Locals("userRole").(string)
	userIDStr, _ := c.Locals("userID").(string)

	// Optional filter by doctor ID
	var doctorID *uint
	if userRole == "doctor" {
		user, userErr := models.GetUserWithDoctor(userIDStr)
		if userErr != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to resolve doctor"})
		}
		if user.DoctorID == nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Doctor profile not found"})
		}
		doctorID = user.DoctorID
	} else {
		doctorIDStr := c.Query("doctorId", "")
		if doctorIDStr != "" {
			parsed, err := strconv.ParseUint(doctorIDStr, 10, 32)
			if err == nil {
				val := uint(parsed)
				doctorID = &val
			}
		}
	}

	reports, err := models.GetRecentReports(limit, incompleteOnly, offset, doctorID)
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

	security.LogEventFromContext(c, security.EventDataAccess,
		"User accessed recent reports list",
		"INFO",
		map[string]interface{}{"count": len(reports)},
	)

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

	security.LogEventFromContext(c, security.EventDataAccess,
		fmt.Sprintf("User accessed report: %d", reportID),
		"INFO",
		map[string]interface{}{"reportId": reportID, "patientId": report.PatientID},
	)

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

	security.LogEventFromContext(c, security.EventDataDeletion,
		fmt.Sprintf("User deleted report: %d", reportID),
		"WARNING",
		map[string]interface{}{"reportId": reportID, "patientId": report.PatientID},
	)

	return c.SendStatus(http.StatusNoContent)
}

// Helper functions for webhook data

func getStringPointer(ptr *string) string {
	if ptr == nil {
		return ""
	}
	return *ptr
}

func getFloatPointer(ptr *float64) float64 {
	if ptr == nil {
		return 0
	}
	return *ptr
}

func getReportURL(reportID uint) string {
	// TODO: Get this from config
	baseURL := os.Getenv("APP_BASE_URL")
	if baseURL == "" {
		baseURL = "https://yourapp.com"
	}
	return fmt.Sprintf("%s/reports/%d", baseURL, reportID)
}
