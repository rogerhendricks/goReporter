package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/rogerhendricks/goReporter/internal/config"
	"gorm.io/gorm"
)

type Patient struct {
	gorm.Model
	MRN       int    `json:"mrn" gorm:"type:int;uniqueIndex;not null"`
	FirstName string `json:"fname" gorm:"type:varchar(255);not null"`
	LastName  string `json:"lname" gorm:"type:varchar(255);not null"`
	DOB       string `json:"dob" gorm:"type:varchar(100)"` // Date of Birth
	Gender    string `json:"gender" gorm:"type:varchar(50)"`
	Email     string `json:"email" gorm:"type:varchar(255)"`
	Phone     string `json:"phone" gorm:"type:varchar(50)"`
	Street    string `json:"street" gorm:"type:varchar(255)"`
	City      string `json:"city" gorm:"type:varchar(100)"`
	State     string `json:"state" gorm:"type:varchar(100)"`
	Country   string `json:"country" gorm:"type:varchar(100)"`
	Postal    string `json:"postal" gorm:"type:varchar(20)"`

	// Relationships
	Reports          []Report          `json:"report"`
	ImplantedDevices []ImplantedDevice `json:"devices"`
	ImplantedLeads   []ImplantedLead   `json:"leads"`
	Medications      []Medication      `json:"medications" gorm:"many2many:patient_medications;"`
	PatientDoctors   []PatientDoctor   `json:"patientDoctors"`
	Tags             []Tag             `json:"tags" gorm:"many2many:patient_tags;"`
	Appointments     []Appointment     `json:"appointments,omitempty" gorm:"foreignKey:PatientID"`
}

type PatientDoctor struct {
	gorm.Model
	PatientID uint  `json:"patientId" gorm:"not null"`
	DoctorID  uint  `json:"doctorId" gorm:"not null"`
	AddressID *uint `json:"addressId"`
	IsPrimary bool  `json:"isPrimary" gorm:"default:false"`

	// Relationships
	Patient Patient  `json:"patient"`
	Doctor  Doctor   `json:"doctor"`
	Address *Address `json:"address"`
}

type PatientSearchParams struct {
	FirstName          string `query:"firstName"`
	LastName           string `query:"lastName"`
	MRN                string `query:"mrn"`
	DOB                string `query:"dob"`
	DoctorName         string `query:"doctorName"`
	DeviceSerial       string `query:"deviceSerial"`
	DeviceManufacturer string `query:"deviceManufacturer"`
	DeviceName         string `query:"deviceName"`
	DeviceModel        string `query:"deviceModel"`
	LeadManufacturer   string `query:"leadManufacturer"`
	LeadName           string `query:"leadName"`
	Tags               []int  `query:"tags"`
	BooleanOperator    string `query:"booleanOperator"` // AND, OR, NOT
	FuzzyMatch         bool   `query:"fuzzyMatch"`
	Limit              int    `query:"limit"`
	Offset             int    `query:"offset"`
}

// JSON type for storing JSON data
type JSON map[string]interface{}

func (j JSON) Value() (driver.Value, error) {
	return json.Marshal(j)
}

func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSON)
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, j)
}

// SavedSearchFilter represents a saved search configuration
type SavedSearchFilter struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      string    `gorm:"not null;index" json:"userId"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	Filters     JSON      `gorm:"type:json" json:"filters"`
	IsDefault   bool      `gorm:"default:false" json:"isDefault"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// SearchHistory tracks user search queries
type SearchHistory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    string    `gorm:"not null;index" json:"userId"`
	Query     string    `gorm:"not null" json:"query"`
	Filters   JSON      `gorm:"type:json" json:"filters"`
	Results   int       `json:"results"`
	CreatedAt time.Time `json:"createdAt"`
}

// Patient model methods
func GetAllPatients() ([]Patient, error) {
	var patients []Patient
	err := config.DB.Preload("ImplantedDevices.Device").
		Preload("ImplantedLeads.Lead").
		Preload("PatientDoctors.Doctor.Addresses").
		Preload("PatientDoctors.Address").
		Preload("Reports").
		Preload("Medications").
		Preload("Tags").
		Find(&patients).Error
	return patients, err
}

func GetMostRecentPatientList() ([]Patient, error) {
	var patients []Patient
	err := config.DB.Preload("ImplantedDevices.Device").
		Preload("ImplantedLeads.Lead").
		Preload("PatientDoctors.Doctor.Addresses").
		Preload("PatientDoctors.Address").
		Preload("Reports").
		Preload("Medications").
		Preload("Tags").
		Order("created_at DESC").
		Limit(10).
		Find(&patients).Error
	return patients, err
}

func GetPatientByID(patientID uint) (*Patient, error) {
	var patient Patient
	err := config.DB.Preload("ImplantedDevices.Device").
		Preload("ImplantedLeads.Lead").
		Preload("PatientDoctors.Doctor.Addresses").
		Preload("PatientDoctors.Address").
		Preload("Reports").
		Preload("Medications").
		Preload("Tags").
		Preload("Appointments").
		First(&patient, patientID).Error
	if err != nil {
		return nil, err
	}
	return &patient, nil
}

// GetPatientByIDForUpdate retrieves a patient by ID within a given transaction
func GetPatientByIDForUpdate(patientID uint, tx *gorm.DB) (*Patient, error) {
	var patient Patient
	err := tx.First(&patient, patientID).Error
	if err != nil {
		return nil, err
	}
	return &patient, nil
}

func CreatePatient(patient *Patient) error {
	return config.DB.Create(patient).Error
}

func UpdatePatient(patient *Patient) error {
	return config.DB.Save(patient).Error
}

func DeletePatient(patientID uint) error {
	return config.DB.Delete(&Patient{}, patientID).Error
}

func SearchPatients(query string) ([]Patient, error) {
	var patients []Patient
	searchTerm := "%" + query + "%"

	dbQuery := config.DB.Model(&Patient{}).Where("LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR CAST(mrn AS TEXT) LIKE ?", searchTerm, searchTerm, searchTerm)

	// First, count the total matching records
	var count int64
	if err := dbQuery.Count(&count).Error; err != nil {
		return nil, err
	}

	// If count is over 10, return an error without fetching the data
	if count > 10 {
		return nil, errors.New("too many results to display, please refine your search by medical record number")
	}

	// If count is acceptable, fetch the patient data with all preloads
	err := config.DB.Preload("ImplantedDevices.Device").
		Preload("ImplantedLeads.Lead").
		Preload("PatientDoctors.Doctor").
		Preload("PatientDoctors.Address").
		Preload("Medications").
		Preload("Tags").
		Where("LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR CAST(mrn AS TEXT) LIKE ?",
				searchTerm, searchTerm, searchTerm).
		Limit(10). // Add a limit here as a safeguard
		Find(&patients).Error
	return patients, err
}

func PatientHasReports(patientID uint) (bool, error) {
	var count int64
	err := config.DB.Model(&Report{}).Where("patient_id = ?", patientID).Count(&count).Error
	return count > 0, err
}

// NEW: Check if a user (who is a doctor) is associated with a patient.
func IsDoctorAssociatedWithPatient(userID uint, patientID uint) (bool, error) {
	var doctor Doctor
	// Find the doctor profile linked to the user ID
	if err := config.DB.Where("user_id = ?", userID).First(&doctor).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil // This user is not a doctor, so no association.
		}
		return false, err // Database error
	}

	// Now check if an entry exists in the patient_doctors join table
	var count int64
	err := config.DB.Model(&PatientDoctor{}).
		Where("doctor_id = ? AND patient_id = ?", doctor.ID, patientID).
		Count(&count).Error

	return count > 0, err
}

// SearchPatientsComplex performs a search with multiple optional parameters.
// func SearchPatientsComplex(params PatientSearchParams) ([]Patient, error) {
// 	var patients []Patient
// 	tx := config.DB.Model(&Patient{})

// 	// Use Joins to link tables for filtering.
// 	// Use distinct joins to avoid ambiguity.
// 	tx = tx.Joins("LEFT JOIN implanted_devices ON implanted_devices.patient_id = patients.id").
// 		Joins("LEFT JOIN devices ON implanted_devices.device_id = devices.id").
// 		Joins("LEFT JOIN implanted_leads ON implanted_leads.patient_id = patients.id").
// 		Joins("LEFT JOIN leads ON implanted_leads.lead_id = leads.id").
// 		Joins("LEFT JOIN patient_doctors ON patient_doctors.patient_id = patients.id").
// 		Joins("LEFT JOIN doctors ON patient_doctors.doctor_id = doctors.id")

// 	// Apply filters conditionally.
// 	if params.FirstName != "" {
// 		tx = tx.Where("LOWER(patients.first_name) LIKE ?", "%"+strings.ToLower(params.FirstName)+"%")
// 	}
// 	if params.LastName != "" {
// 		tx = tx.Where("LOWER(patients.last_name) LIKE ?", "%"+strings.ToLower(params.LastName)+"%")
// 	}
// 	if params.MRN != "" {
// 		tx = tx.Where("patients.mrn = ?", params.MRN)
// 	}
// 	if params.DOB != "" {
// 		tx = tx.Where("patients.dob = ?", params.DOB)
// 	}
// 	if params.DoctorName != "" {
// 		tx = tx.Where("LOWER(doctors.name) LIKE ?", "%"+strings.ToLower(params.DoctorName)+"%")
// 	}
// 	if params.DeviceSerial != "" {
// 		tx = tx.Where("LOWER(implanted_devices.serial) LIKE ?", "%"+strings.ToLower(params.DeviceSerial)+"%")
// 	}
// 	if params.DeviceManufacturer != "" {
// 		tx = tx.Where("LOWER(devices.manufacturer) LIKE ?", "%"+strings.ToLower(params.DeviceManufacturer)+"%")
// 	}
// 	if params.DeviceName != "" {
// 		tx = tx.Where("LOWER(devices.name) LIKE ?", "%"+strings.ToLower(params.DeviceName)+"%")
// 	}
// 	if params.DeviceModel != "" {
// 		tx = tx.Where("LOWER(devices.dev_model) LIKE ?", "%"+strings.ToLower(params.DeviceModel)+"%")
// 	}
// 	if params.LeadManufacturer != "" {
// 		tx = tx.Where("LOWER(leads.manufacturer) LIKE ?", "%"+strings.ToLower(params.LeadManufacturer)+"%")
// 	}
// 	if params.LeadName != "" {
// 		tx = tx.Where("LOWER(leads.name) LIKE ?", "%"+strings.ToLower(params.LeadName)+"%")
// 	}

// 	if len(params.Tags) > 0 {
// 		tx = tx.Joins("JOIN patient_tags ON patient_tags.patient_id = patients.id").
// 			Where("patient_tags.tag_id IN ?", params.Tags)
// 	}

// 	// Group by patient fields to get distinct patients and preload necessary data for the response.
// 	err := tx.Preload("PatientDoctors.Doctor").
// 		Preload("PatientDoctors.Address").
// 		Preload("Tags").
// 		Group("patients.id, patients.created_at, patients.updated_at, patients.deleted_at, patients.mrn, patients.first_name, patients.last_name, patients.dob, patients.gender, patients.email, patients.phone, patients.street, patients.city, patients.state, patients.country, patients.postal").
// 		Find(&patients).Error

// 	if err != nil {
// 		return nil, err
// 	}
// 	return patients, nil
// }

// GetPatientsPaginated retrieves patients with pagination and search
func GetPatientsPaginated(search string, page, limit int) ([]Patient, int64, error) {
	var patients []Patient
	var total int64

	tx := config.DB.Model(&Patient{}).
		Preload("PatientDoctors.Doctor").
		Preload("PatientDoctors.Address").
		Preload("ImplantedDevices.Device").
		Preload("ImplantedLeads.Lead").
		Preload("Tags")

	// Apply search filter if provided
	if search != "" {
		searchQuery := "%" + strings.ToLower(search) + "%"
		tx = tx.Where("LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR CAST(mrn AS TEXT) LIKE ?",
			searchQuery, searchQuery, searchQuery)
	}

	// Get total count
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * limit
	err := tx.Offset(offset).Limit(limit).Order("last_name ASC, first_name ASC").Find(&patients).Error
	if err != nil {
		return nil, 0, err
	}

	return patients, total, nil
}

// GetPatientsPaginatedForDoctor retrieves patients for a specific doctor with pagination
func GetPatientsPaginatedForDoctor(userID string, search string, page, limit int) ([]Patient, int64, error) {
	var patients []Patient
	var total int64

	// First, find the doctor associated with this user
	var doctor Doctor
	if err := config.DB.Where("user_id = ?", userID).First(&doctor).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []Patient{}, 0, nil // No doctor profile means no patients
		}
		return nil, 0, err
	}

	// Query patients associated with this doctor
	tx := config.DB.Model(&Patient{}).
		Joins("JOIN patient_doctors ON patient_doctors.patient_id = patients.id").
		Where("patient_doctors.doctor_id = ?", doctor.ID).
		Preload("PatientDoctors.Doctor").
		Preload("PatientDoctors.Address").
		Preload("ImplantedDevices.Device").
		Preload("ImplantedLeads.Lead").
		Preload("Tags")

	// Apply search filter if provided
	if search != "" {
		searchQuery := "%" + strings.ToLower(search) + "%"
		tx = tx.Where("LOWER(patients.first_name) LIKE ? OR LOWER(patients.last_name) LIKE ? OR CAST(patients.mrn AS TEXT) LIKE ?",
			searchQuery, searchQuery, searchQuery)
	}

	// Get total count - need to use distinct count for patients
	var patientIDs []uint
	if err := tx.Distinct("patients.id").Pluck("patients.id", &patientIDs).Error; err != nil {
		return nil, 0, err
	}
	total = int64(len(patientIDs))

	// Get paginated results
	offset := (page - 1) * limit
	err := tx.Group("patients.id").
		Offset(offset).
		Limit(limit).
		Order("patients.last_name ASC, patients.first_name ASC").
		Find(&patients).Error
	if err != nil {
		return nil, 0, err
	}

	return patients, total, nil
}

// SearchPatientsComplex performs a search with multiple optional parameters.
// Enhanced with fuzzy matching and boolean operators
func SearchPatientsComplex(params PatientSearchParams) ([]Patient, error) {
	var patients []Patient

	// Build query based on boolean operator
	var tx *gorm.DB
	switch strings.ToUpper(params.BooleanOperator) {
	case "OR":
		tx = buildORQuery(params)
	case "NOT":
		tx = buildNOTQuery(params)
	default: // AND or empty
		tx = buildANDQuery(params)
	}

	// Apply pagination
	if params.Limit > 0 {
		tx = tx.Limit(params.Limit)
	} else {
		tx = tx.Limit(100) // Default limit
	}
	if params.Offset > 0 {
		tx = tx.Offset(params.Offset)
	}

	// Group by patient fields to get distinct patients and preload necessary data
	err := tx.Preload("PatientDoctors.Doctor").
		Preload("PatientDoctors.Address").
		Preload("Tags").
		Group("patients.id, patients.created_at, patients.updated_at, patients.deleted_at, patients.mrn, patients.first_name, patients.last_name, patients.dob, patients.gender, patients.email, patients.phone, patients.street, patients.city, patients.state, patients.country, patients.postal").
		Find(&patients).Error

	if err != nil {
		return nil, err
	}
	return patients, nil
}

// buildNOTQuery builds query with NOT logic
func buildANDQuery(params PatientSearchParams) *gorm.DB {
	tx := config.DB.Model(&Patient{})

	// Join tables
	tx = tx.Joins("LEFT JOIN implanted_devices ON implanted_devices.patient_id = patients.id").
		Joins("LEFT JOIN devices ON implanted_devices.device_id = devices.id").
		Joins("LEFT JOIN implanted_leads ON implanted_leads.patient_id = patients.id").
		Joins("LEFT JOIN leads ON implanted_leads.lead_id = leads.id").
		Joins("LEFT JOIN patient_doctors ON patient_doctors.patient_id = patients.id").
		Joins("LEFT JOIN doctors ON patient_doctors.doctor_id = doctors.id")

	// Apply filters
	if params.FirstName != "" {
		if params.FuzzyMatch {
			tx = tx.Where("LOWER(patients.first_name) LIKE ?", "%"+strings.ToLower(params.FirstName)+"%")
		} else {
			tx = tx.Where("patients.first_name = ?", params.FirstName)
		}
	}
	if params.LastName != "" {
		if params.FuzzyMatch {
			tx = tx.Where("LOWER(patients.last_name) LIKE ?", "%"+strings.ToLower(params.LastName)+"%")
		} else {
			tx = tx.Where("patients.last_name = ?", params.LastName)
		}
	}
	if params.MRN != "" {
		tx = tx.Where("patients.mrn = ?", params.MRN)
	}
	if params.DOB != "" {
		tx = tx.Where("patients.dob = ?", params.DOB)
	}
	if params.DoctorName != "" {
		if params.FuzzyMatch {
			tx = tx.Where("LOWER(doctors.full_name) LIKE ?", "%"+strings.ToLower(params.DoctorName)+"%")
		} else {
			tx = tx.Where("doctors.full_name = ?", params.DoctorName)
		}
	}
	if params.DeviceSerial != "" {
		if params.FuzzyMatch {
			tx = tx.Where("LOWER(implanted_devices.serial) LIKE ?", "%"+strings.ToLower(params.DeviceSerial)+"%")
		} else {
			tx = tx.Where("implanted_devices.serial = ?", params.DeviceSerial)
		}
	}
	if params.DeviceManufacturer != "" {
		if params.FuzzyMatch {
			tx = tx.Where("LOWER(devices.manufacturer) LIKE ?", "%"+strings.ToLower(params.DeviceManufacturer)+"%")
		} else {
			tx = tx.Where("devices.manufacturer = ?", params.DeviceManufacturer)
		}
	}
	if params.DeviceName != "" {
		if params.FuzzyMatch {
			tx = tx.Where("LOWER(devices.name) LIKE ?", "%"+strings.ToLower(params.DeviceName)+"%")
		} else {
			tx = tx.Where("devices.name = ?", params.DeviceName)
		}
	}
	if params.DeviceModel != "" {
		if params.FuzzyMatch {
			tx = tx.Where("LOWER(devices.dev_model) LIKE ?", "%"+strings.ToLower(params.DeviceModel)+"%")
		} else {
			tx = tx.Where("devices.dev_model = ?", params.DeviceModel)
		}
	}
	if params.LeadManufacturer != "" {
		if params.FuzzyMatch {
			tx = tx.Where("LOWER(leads.manufacturer) LIKE ?", "%"+strings.ToLower(params.LeadManufacturer)+"%")
		} else {
			tx = tx.Where("leads.manufacturer = ?", params.LeadManufacturer)
		}
	}
	if params.LeadName != "" {
		if params.FuzzyMatch {
			tx = tx.Where("LOWER(leads.name) LIKE ?", "%"+strings.ToLower(params.LeadName)+"%")
		} else {
			tx = tx.Where("leads.name = ?", params.LeadName)
		}
	}
	if len(params.Tags) > 0 {
		tx = tx.Joins("JOIN patient_tags ON patient_tags.patient_id = patients.id").
			Where("patient_tags.tag_id IN ?", params.Tags)
	}

	return tx
}

// buildORQuery builds query with OR logic
func buildORQuery(params PatientSearchParams) *gorm.DB {
	tx := config.DB.Model(&Patient{})
	var conditions []string
	var values []interface{}

	// Patient fields
	if params.FirstName != "" {
		if params.FuzzyMatch {
			conditions = append(conditions, "LOWER(patients.first_name) LIKE ?")
			values = append(values, "%"+strings.ToLower(params.FirstName)+"%")
		} else {
			conditions = append(conditions, "patients.first_name = ?")
			values = append(values, params.FirstName)
		}
	}
	if params.LastName != "" {
		if params.FuzzyMatch {
			conditions = append(conditions, "LOWER(patients.last_name) LIKE ?")
			values = append(values, "%"+strings.ToLower(params.LastName)+"%")
		} else {
			conditions = append(conditions, "patients.last_name = ?")
			values = append(values, params.LastName)
		}
	}
	if params.MRN != "" {
		conditions = append(conditions, "patients.mrn = ?")
		values = append(values, params.MRN)
	}
	if params.DOB != "" {
		conditions = append(conditions, "patients.dob = ?")
		values = append(values, params.DOB)
	}

	if len(conditions) > 0 {
		tx = tx.Where(strings.Join(conditions, " OR "), values...)
	}

	// Add joins if device/lead/doctor filters are present
	if params.DeviceSerial != "" || params.DeviceManufacturer != "" || params.DeviceName != "" || params.DeviceModel != "" {
		tx = tx.Joins("LEFT JOIN implanted_devices ON implanted_devices.patient_id = patients.id").
			Joins("LEFT JOIN devices ON implanted_devices.device_id = devices.id")
	}
	if params.LeadManufacturer != "" || params.LeadName != "" {
		tx = tx.Joins("LEFT JOIN implanted_leads ON implanted_leads.patient_id = patients.id").
			Joins("LEFT JOIN leads ON implanted_leads.lead_id = leads.id")
	}
	if params.DoctorName != "" {
		tx = tx.Joins("LEFT JOIN patient_doctors ON patient_doctors.patient_id = patients.id").
			Joins("LEFT JOIN doctors ON patient_doctors.doctor_id = doctors.id")
	}

	return tx
}

// buildNOTQuery builds query with NOT logic
func buildNOTQuery(params PatientSearchParams) *gorm.DB {
	tx := config.DB.Model(&Patient{})

	if params.FirstName != "" {
		tx = tx.Where("patients.first_name != ?", params.FirstName)
	}
	if params.LastName != "" {
		tx = tx.Where("patients.last_name != ?", params.LastName)
	}
	if params.MRN != "" {
		tx = tx.Where("patients.mrn != ?", params.MRN)
	}
	if len(params.Tags) > 0 {
		tx = tx.Where("patients.id NOT IN (SELECT patient_id FROM patient_tags WHERE tag_id IN ?)", params.Tags)
	}

	return tx
}

// SaveSearchFilter saves a user's search configuration
func SaveSearchFilter(filter *SavedSearchFilter) error {
	// If marking as default, unset other defaults for this user
	if filter.IsDefault {
		config.DB.Model(&SavedSearchFilter{}).
			Where("user_id = ? AND id != ?", filter.UserID, filter.ID).
			Update("is_default", false)
	}
	return config.DB.Save(filter).Error
}

// GetSavedSearchFilters retrieves all saved searches for a user
func GetSavedSearchFilters(userID string) ([]SavedSearchFilter, error) {
	var filters []SavedSearchFilter
	err := config.DB.Where("user_id = ?", userID).
		Order("is_default DESC, updated_at DESC").
		Find(&filters).Error
	return filters, err
}

// DeleteSavedSearchFilter removes a saved search
func DeleteSavedSearchFilter(id uint, userID string) error {
	return config.DB.Where("id = ? AND user_id = ?", id, userID).
		Delete(&SavedSearchFilter{}).Error
}

// AddSearchHistory records a search query
func AddSearchHistory(history *SearchHistory) error {
	return config.DB.Create(history).Error
}

// GetSearchHistory retrieves recent search history for a user
func GetSearchHistory(userID string, limit int) ([]SearchHistory, error) {
	var history []SearchHistory
	err := config.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&history).Error
	return history, err
}

// GetSearchSuggestions provides search suggestions based on history
func GetSearchSuggestions(userID string, query string, limit int) ([]string, error) {
	var suggestions []string

	err := config.DB.Model(&SearchHistory{}).
		Select("DISTINCT query").
		Where("user_id = ? AND LOWER(query) LIKE ?", userID, "%"+strings.ToLower(query)+"%").
		Order("created_at DESC").
		Limit(limit).
		Pluck("query", &suggestions).Error

	return suggestions, err
}

// NullTime is a custom type that can scan from both string and time.Time (for cross-DB compatibility)
type NullTime struct {
	Time  time.Time
	Valid bool
}

// Scan implements sql.Scanner interface to handle both string and time.Time from database
func (nt *NullTime) Scan(value interface{}) error {
	if value == nil {
		nt.Time, nt.Valid = time.Time{}, false
		return nil
	}

	switch v := value.(type) {
	case time.Time:
		nt.Time, nt.Valid = v, true
		return nil
	case string:
		// Try to parse the string as time
		if v == "" {
			nt.Time, nt.Valid = time.Time{}, false
			return nil
		}
		// Try multiple formats
		formats := []string{
			time.RFC3339,
			"2006-01-02 15:04:05.999999999-07:00",
			"2006-01-02 15:04:05.999999999",
			"2006-01-02 15:04:05",
			"2006-01-02",
		}
		for _, format := range formats {
			if t, err := time.Parse(format, v); err == nil {
				nt.Time, nt.Valid = t, true
				return nil
			}
		}
		return errors.New("failed to parse time string: " + v)
	case []byte:
		return nt.Scan(string(v))
	default:
		return errors.New("incompatible type for NullTime")
	}
}

// Value implements driver.Valuer interface
func (nt NullTime) Value() (driver.Value, error) {
	if !nt.Valid {
		return nil, nil
	}
	return nt.Time, nil
}

// MarshalJSON implements json.Marshaler
func (nt NullTime) MarshalJSON() ([]byte, error) {
	if !nt.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(nt.Time)
}

// UnmarshalJSON implements json.Unmarshaler
func (nt *NullTime) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		nt.Valid = false
		return nil
	}
	var t time.Time
	if err := json.Unmarshal(data, &t); err != nil {
		return err
	}
	nt.Time = t
	nt.Valid = true
	return nil
}

// OverduePatient represents a patient who is overdue for a report
type OverduePatient struct {
	PatientID         uint      `json:"patientId"`
	FirstName         string    `json:"firstName"`
	LastName          string    `json:"lastName"`
	MRN               int       `json:"mrn"`
	DeviceType        string    `json:"deviceType"`
	ReportType        string    `json:"reportType"`
	LastReportDate    *NullTime `json:"lastReportDate"`
	DaysSinceReport   *int      `json:"daysSinceReport"`
	DeviceSerial      string    `json:"deviceSerial"`
	ImplantedDeviceID uint      `json:"implantedDeviceId"`
}

// GetOverduePatients retrieves patients who are overdue for reports based on device type and report type
func GetOverduePatients(page int, limit int, doctorID *uint) ([]OverduePatient, int64, error) {
	var results []OverduePatient
	var total int64

	// Base query to get all patients with active implanted devices (excludes explanted and deleted)
	query := `
		WITH patient_devices AS (
			SELECT 
				p.id as patient_id,
				p.first_name,
				p.last_name,
				p.mrn,
				id.id as implanted_device_id,
				id.serial as device_serial,
				d.type as device_type
			FROM patients p
			INNER JOIN implanted_devices id ON p.id = id.patient_id
			INNER JOIN devices d ON id.device_id = d.id
			WHERE id.status = 'Active'
				AND (id.explanted_at IS NULL OR id.explanted_at = '')
				AND id.deleted_at IS NULL
				AND (LOWER(d.type) = 'defibrillator' OR LOWER(d.type) = 'pacemaker')
		),
		latest_reports AS (
			SELECT 
				r.patient_id,
				r.report_type,
				MAX(r.report_date) as last_report_date
			FROM reports r
			WHERE r.report_type IN ('In Clinic', 'Remote')
			GROUP BY r.patient_id, r.report_type
		),
		overdue_list AS (
			SELECT 
				pd.patient_id,
				pd.first_name,
				pd.last_name,
				pd.mrn,
				pd.device_type,
				pd.device_serial,
				pd.implanted_device_id,
				'In Clinic' as report_type,
				lr.last_report_date,
				CASE 
					WHEN lr.last_report_date IS NULL THEN NULL
					ELSE CAST(JULIANDAY('now') - JULIANDAY(lr.last_report_date) AS INTEGER)
				END as days_since_report
			FROM patient_devices pd
			LEFT JOIN latest_reports lr ON pd.patient_id = lr.patient_id AND lr.report_type = 'In Clinic'
			WHERE (
				-- Defibrillator: In Clinic report needed every 6 months (183 days)
				(LOWER(pd.device_type) = 'defibrillator' AND (lr.last_report_date IS NULL OR JULIANDAY('now') - JULIANDAY(lr.last_report_date) > 183))
				OR
				-- Pacemaker: In Clinic report needed every 12 months (365 days)
				(LOWER(pd.device_type) = 'pacemaker' AND (lr.last_report_date IS NULL OR JULIANDAY('now') - JULIANDAY(lr.last_report_date) > 365))
			)
			
			UNION ALL
			
			SELECT 
				pd.patient_id,
				pd.first_name,
				pd.last_name,
				pd.mrn,
				pd.device_type,
				pd.device_serial,
				pd.implanted_device_id,
				'Remote' as report_type,
				lr.last_report_date,
				CASE 
					WHEN lr.last_report_date IS NULL THEN NULL
					ELSE CAST(JULIANDAY('now') - JULIANDAY(lr.last_report_date) AS INTEGER)
				END as days_since_report
			FROM patient_devices pd
			LEFT JOIN latest_reports lr ON pd.patient_id = lr.patient_id AND lr.report_type = 'Remote'
			WHERE (
				-- Defibrillator: Remote report needed every 6 months (183 days)
				(LOWER(pd.device_type) = 'defibrillator' AND (lr.last_report_date IS NULL OR JULIANDAY('now') - JULIANDAY(lr.last_report_date) > 183))
				OR
				-- Pacemaker: Remote report needed every 12 months (365 days)
				(LOWER(pd.device_type) = 'pacemaker' AND (lr.last_report_date IS NULL OR JULIANDAY('now') - JULIANDAY(lr.last_report_date) > 365))
			)
		)
		SELECT * FROM overdue_list`

	// If doctor is specified, filter by their patients
	doctorFilter := ""
	var args []interface{}

	if doctorID != nil {
		doctorFilter = `
			WHERE patient_id IN (
				SELECT patient_id FROM patient_doctors WHERE doctor_id = ?
			)`
		args = append(args, *doctorID)
	}

	// Get total count
	countQuery := `SELECT COUNT(*) FROM (` + query + doctorFilter + `) as counted`
	if err := config.DB.Raw(countQuery, args...).Count(&total).Error; err != nil {
		return []OverduePatient{}, 0, err
	}

	// Get paginated results with ordering (most overdue first)
	offset := (page - 1) * limit
	paginatedQuery := query + doctorFilter + ` ORDER BY 
		days_since_report DESC NULLS LAST,
		last_name ASC
		LIMIT ? OFFSET ?`

	args = append(args, limit, offset)

	if err := config.DB.Raw(paginatedQuery, args...).Scan(&results).Error; err != nil {
		return []OverduePatient{}, 0, err
	}

	// Ensure we always return an array, never nil
	if results == nil {
		results = []OverduePatient{}
	}

	return results, total, nil
}
