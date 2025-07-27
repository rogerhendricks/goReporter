package models

import (
    "time"
    "gorm.io/gorm"
)

type ImplantedLead struct {
    gorm.Model
    PatientID   uint      `json:"patientId" gorm:"not null"`
    LeadID      uint      `json:"leadId" gorm:"not null"`
    Serial      string    `json:"serial" gorm:"type:varchar(100);not null"`
    Chamber     string    `json:"chamber" gorm:"type:varchar(50);not null"`
    ImplantedAt time.Time `json:"implantedAt" gorm:"not null"`
    ExplantedAt *time.Time `json:"explantedAt"`
    Status      string    `json:"status" gorm:"type:varchar(50);default:'Active'"`
    
    // Relationships
    Patient Patient `json:"patient"`
    Lead    Lead    `json:"lead"`
}