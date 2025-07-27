package models

import (
    "github.com/rogerhendricks/goReporter/internal/config"
    "gorm.io/gorm"
)

type Medication struct {
    gorm.Model
    Name        string `json:"name" gorm:"type:varchar(255);not null"`
    Description string `json:"description" gorm:"type:text"`
    Dosage      string `json:"dosage" gorm:"type:varchar(100)"`
    Category    string `json:"category" gorm:"type:varchar(100)"`
    
    // Many-to-many relationship
    Patients []Patient `json:"patients" gorm:"many2many:patient_medications;"`
}

func GetAllMedications() ([]Medication, error) {
    var medications []Medication
    err := config.DB.Find(&medications).Error
    return medications, err
}

func GetMedicationByID(medicationID uint) (*Medication, error) {
    var medication Medication
    err := config.DB.First(&medication, medicationID).Error
    if err != nil {
        return nil, err
    }
    return &medication, nil
}

func CreateMedication(medication *Medication) error {
    return config.DB.Create(medication).Error
}

func UpdateMedication(medication *Medication) error {
    return config.DB.Save(medication).Error
}

func DeleteMedication(medicationID uint) error {
    return config.DB.Delete(&Medication{}, medicationID).Error
}