package models

import (
	"errors"
	"strings"
	"encoding/json"
	"time"
	"database/sql/driver"
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