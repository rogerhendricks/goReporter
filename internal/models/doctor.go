package models

import (
    "github.com/rogerhendricks/goReporter/internal/config"
    "gorm.io/gorm"
)

type Doctor struct {
    gorm.Model
    Name   string    `json:"name" gorm:"type:varchar(100);not null"`
    Email       string    `json:"email" gorm:"type:varchar(255);uniqueIndex"`
    Phone       string    `json:"phone" gorm:"type:varchar(20)"`
    Specialty   string    `json:"specialty" gorm:"type:varchar(100)"`
    Addresses   []Address `json:"addresses" gorm:"foreignKey:DoctorID;constraint:OnDelete:CASCADE"`
    Reports     []Report  `json:"reports"`
}

// GetAllDoctors retrieves all doctors with their addresses
func GetAllDoctors() ([]Doctor, error) {
    var doctors []Doctor
    err := config.DB.Preload("Addresses").Find(&doctors).Error
    if err != nil {
        return []Doctor{}, err // Return empty slice instead of nil
    }
    return doctors, err
}

// GetAllDoctorsBySearch retrieves doctors matching search criteria
func GetAllDoctorsBySearch(query string) ([]Doctor, error) {
    var doctors []Doctor
    tx := config.DB.Preload("Addresses")

    if query != "" {
        searchQuery := "%" + query + "%"
        tx = tx.Where("name LIKE ? OR email LIKE ? OR specialty LIKE ?", searchQuery, searchQuery, searchQuery)
    }

    err := tx.Find(&doctors).Error
    if err != nil {
        return []Doctor{}, err // Return empty slice instead of nil
    }
    return doctors, nil
}
// GetDoctorByID retrieves a doctor by ID with addresses
func GetDoctorByID(doctorID uint) (*Doctor, error) {
    var doctor Doctor
    err := config.DB.Preload("Addresses").First(&doctor, doctorID).Error
    if err != nil {
        return nil, err
    }
    return &doctor, nil
}

// CreateDoctor creates a new doctor with addresses
func CreateDoctor(doctor *Doctor) error {
    return config.DB.Create(doctor).Error
}

// UpdateDoctor updates an existing doctor
func UpdateDoctor(doctor *Doctor) error {
    return config.DB.Save(doctor).Error
}

// DeleteDoctor deletes a doctor by ID
func DeleteDoctor(doctorID uint) error {
    return config.DB.Delete(&Doctor{}, doctorID).Error
}

// DoctorHasReports checks if doctor has any reports
func DoctorHasReports(doctorID uint) (bool, error) {
    var count int64
    err := config.DB.Model(&Report{}).Where("doctor_id = ?", doctorID).Count(&count).Error
    return count > 0, err
}

// UpdateDoctorAddresses updates doctor's addresses
func UpdateDoctorAddresses(doctorID uint, addresses []Address) error {
    // Start transaction
    tx := config.DB.Begin()
    
    // Delete existing addresses
    if err := tx.Where("doctor_id = ?", doctorID).Delete(&Address{}).Error; err != nil {
        tx.Rollback()
        return err
    }
    
    // Add new addresses
    // for i := range addresses {
    //     addresses[i].DoctorID = doctorID
    //     if err := tx.Create(&addresses[i]).Error; err != nil {
    //         tx.Rollback()
    //         return err
    //     }
    // }
    
    // Create clean address objects without IDs
    for _, addr := range addresses {
        newAddress := Address{
            Street:   addr.Street,
            City:     addr.City,
            State:    addr.State,
            Zip:      addr.Zip,
            DoctorID: doctorID,
        }
        
        if err := tx.Create(&newAddress).Error; err != nil {
            tx.Rollback()
            return err
        }
    }

    return tx.Commit().Error
}