package models

import "gorm.io/gorm"

type Report struct {
    gorm.Model
    Title       string `json:"title" gorm:"type:varchar(255);not null"`
    Description string `json:"description" gorm:"type:text"`
    PatientID   uint   `json:"patient_id"`
    UserID      uint   `json:"user_id"`
    DoctorID    *uint  `json:"doctor_id"` // Pointer to allow null
}