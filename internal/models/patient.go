package models

import (
    
    "errors"
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
}

type PatientDoctor struct {
    gorm.Model
    PatientID uint `json:"patientId" gorm:"not null"`
    DoctorID  uint `json:"doctorId" gorm:"not null"`
    AddressID *uint `json:"addressId"`
    IsPrimary bool `json:"isPrimary" gorm:"default:false"`
    
    // Relationships
    Patient Patient `json:"patient"`
    Doctor  Doctor  `json:"doctor"`
    Address *Address `json:"address"`
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