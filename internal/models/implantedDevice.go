package models

import (
    "time"
    "gorm.io/gorm"
)

type ImplantedDevice struct {
    gorm.Model
    PatientID    uint      `json:"patientId" gorm:"not null"`
    DeviceID     uint      `json:"deviceId" gorm:"not null"`
    Serial       string    `json:"serial" gorm:"type:varchar(100);not null"`
    ImplantedAt  time.Time `json:"implantedAt" gorm:"not null"`
    ExplantedAt  *time.Time `json:"explantedAt" gorm:"default:null"`
    Status       string    `json:"status" gorm:"type:varchar(50);default:'Active'"`
    
    // Relationships
    Patient Patient `json:"patient"`
    Device  Device  `json:"device"`
}