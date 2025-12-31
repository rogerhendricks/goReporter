package models

import (
	"time"

	"github.com/rogerhendricks/goReporter/internal/config"
	"gorm.io/gorm"
)

// Arrhythmia model stores individual arrhythmia events related to a report.
type Arrhythmia struct {
	gorm.Model
	ReportID uint   `json:"reportId"`
	Name     string `json:"name" gorm:"type:varchar(100)"`
	Type     string `json:"type" gorm:"type:varchar(100)"` // e.g., "SVT", "VT", "AF"
	Duration *int   `json:"duration"`                      // Duration in seconds, optional
	Count    *int   `json:"count"`                         // Number of events, optional
}

// Report model to store all the data from a device interrogation.
type Report struct {
	gorm.Model
	PatientID uint    `json:"patientId"`
	UserID    uint    `json:"userId"`   // The user who created the report
	DoctorID  *uint   `json:"doctorId"` // Optional doctor associated with the report
	Patient   Patient `json:"patient"`  // Belongs to Patient
	User      User    `json:"user"`     // Belongs to User
	Doctor    *Doctor `json:"doctor"`   // Belongs to Doctor

	// Core Report Info
	ReportDate   time.Time `json:"reportDate"`
	ReportType   string    `json:"reportType" gorm:"type:varchar(100)"`  // e.g., "Scheduled", "Symptom"
	ReportStatus string    `json:"reportStatus" gorm:"type:varchar(50)"` // e.g., "Reviewed", "Unreviewed"

	// Patient Substrate
	CurrentHeartRate  *int    `json:"currentHeartRate"`
	CurrentRhythm     *string `json:"currentRhythm" gorm:"type:varchar(100)"`
	CurrentDependency *string `json:"currentDependency" gorm:"type:varchar(100)"`

	// Patient Arrhythmias
	MdcIdcStatAtafBurdenPercent *float64 `json:"mdc_idc_stat_ataf_burden_percent"`
	QrsDuration                 *float64 `json:"qrs_duration"`

	// Device Settings
	MdcIdcSetBradyMode            *string `json:"mdc_idc_set_brady_mode" gorm:"type:varchar(50)"`
	MdcIdcSetBradyLowrate         *int    `json:"mdc_idc_set_brady_lowrate"`
	MdcIdcSetBradyMaxTrackingRate *int    `json:"mdc_idc_set_brady_max_tracking_rate"`
	MdcIdcSetBradyMaxSensorRate   *int    `json:"mdc_idc_set_brady_max_sensor_rate"`
	MdcIdcDevSav                  *string `json:"mdc_idc_dev_sav" gorm:"type:varchar(50)"`
	MdcIdcDevPav                  *string `json:"mdc_idc_dev_pav" gorm:"type:varchar(50)"`
	// Tachy Settings

	// Pacing Percentages
	MdcIdcStatBradyRaPercentPaced  *float64 `json:"mdc_idc_stat_brady_ra_percent_paced"`
	MdcIdcStatBradyRvPercentPaced  *float64 `json:"mdc_idc_stat_brady_rv_percent_paced"`
	MdcIdcStatBradyLvPercentPaced  *float64 `json:"mdc_idc_stat_brady_lv_percent_paced"`
	MdcIdcStatTachyBivPercentPaced *float64 `json:"mdc_idc_stat_tachy_biv_percent_paced"`

	// Battery/Device Diagnostics
	MdcIdcBattVolt       *float64 `json:"mdc_idc_batt_volt"`
	MdcIdcBattRemaining  *float64 `json:"mdc_idc_batt_remaining"` // e.g., years
	MdcIdcBattPercentage *float64 `json:"mdc_idc_batt_percentage"`
	MdcIdcBattStatus     *string  `json:"mdc_idc_batt_status" gorm:"type:varchar(50)"`
	MdcIdcCapChargeTime  *float64 `json:"mdc_idc_cap_charge_time"`

	// Atrial Measurements
	MdcIdcMsmtRaImpedanceMean   *float64 `json:"mdc_idc_msmt_ra_impedance_mean"`
	MdcIdcMsmtRaSensing         *float64 `json:"mdc_idc_msmt_ra_sensing"`
	MdcIdcMsmtRaPacingThreshold *float64 `json:"mdc_idc_msmt_ra_pacing_threshold"`
	MdcIdcMsmtRaPw              *float64 `json:"mdc_idc_msmt_ra_pw"`

	// RV Measurements
	MdcIdcMsmtRvImpedanceMean   *float64 `json:"mdc_idc_msmt_rv_impedance_mean"`
	MdcIdcMsmtRvSensing         *float64 `json:"mdc_idc_msmt_rv_sensing"`
	MdcIdcMsmtRvPacingThreshold *float64 `json:"mdc_idc_msmt_rv_pacing_threshold"`
	MdcIdcMsmtRvPw              *float64 `json:"mdc_idc_msmt_rv_pw"`
	MdcIdcMsmtShockImpedance    *float64 `json:"mdc_idc_msmt_shock_impedance"`

	// LV Measurements
	MdcIdcMsmtLvImpedanceMean   *float64 `json:"mdc_idc_msmt_lv_impedance_mean"`
	MdcIdcMsmtLvSensing         *float64 `json:"mdc_idc_msmt_lv_sensing"`
	MdcIdcMsmtLvPacingThreshold *float64 `json:"mdc_idc_msmt_lv_pacing_threshold"`
	MdcIdcMsmtLvPw              *float64 `json:"mdc_idc_msmt_lv_pw"`

	// Report Info
	Comments    *string `json:"comments" gorm:"type:text"`
	IsCompleted *bool   `json:"isCompleted" gorm:"default:false"`
	FilePath    *string `json:"file_path" gorm:"type:varchar(255)"`
	FileUrl     *string `json:"file_url" gorm:"type:varchar(255)"`

	// Relational Data
	Arrhythmias []Arrhythmia `json:"arrhythmias" gorm:"foreignKey:ReportID;constraint:OnDelete:CASCADE"`
	Tags        []Tag        `json:"tags" gorm:"many2many:report_tags;"`
}

// GetReportsByPatientID retrieves all reports for a specific patient.
func GetReportsByPatientID(patientID uint) ([]Report, error) {
	var reports []Report
	// Order by report date descending to show the newest first
	err := config.DB.Model(&Report{}).
		Select("id", "patient_id",
			"report_date", "mdc_idc_batt_status",
			"report_type", "report_status", "file_url",
		).
		Where("patient_id = ?", patientID).
		Order("report_date desc").
		Find(&reports).Error
	return reports, err
}

// GetReportByID retrieves a single report by its ID, preloading related data.
func GetReportByID(reportID uint) (*Report, error) {
	var report Report
	err := config.DB.Preload("Arrhythmias").Preload("Tags").First(&report, reportID).Error
	if err != nil {
		return nil, err
	}
	return &report, nil
}

func GetRecentReports(limit int, incompleteOnly bool, offset int) ([]Report, error) {
	if limit <= 0 || limit > 100 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	var reports []Report
	query := config.DB.
		Preload("Patient").
		Preload("User").
		Preload("Tags")

	if incompleteOnly {
		query = query.Where("is_completed IS NULL OR is_completed = ?", false)
	}

	err := query.
		Order("report_date DESC").
		Offset(offset).
		Limit(limit).
		Find(&reports).Error
	return reports, err
}

// DeleteReport deletes a report by its ID.
// GORM's cascade constraint will handle deleting associated arrhythmias.
func DeleteReport(reportID uint) error {
	return config.DB.Delete(&Report{}, reportID).Error
}
