package models

import (
    "github.com/rogerhendricks/goReporter/internal/config"
    "gorm.io/gorm"
)

type Lead struct {
    gorm.Model
    Name         string          `json:"name" gorm:"type:varchar(255);not null"`
    Manufacturer string          `json:"manufacturer" gorm:"type:varchar(255)"`
    LeadModel    string          `json:"model" gorm:"type:varchar(50)"`
    IsMri        bool            `json:"is_mri" gorm:"default:false"`
    Type         string          `json:"type" gorm:"type:varchar(50)"`
    Implanted    []ImplantedLead `json:"implanted"`
}

// GetAllLeads retrieves all leads
func GetAllLeads() ([]Lead, error) {
    var leads []Lead
    err := config.DB.Find(&leads).Error
    return leads, err
}

// GetLeadByID retrieves a lead by ID
func GetLeadByID(leadID uint) (*Lead, error) {
    var lead Lead
    err := config.DB.First(&lead, leadID).Error
    if err != nil {
        return nil, err
    }
    return &lead, nil
}

// CreateLead creates a new lead
func CreateLead(lead *Lead) error {
    return config.DB.Create(lead).Error
}

// UpdateLead updates an existing lead
func UpdateLead(lead *Lead) error {
    return config.DB.Save(lead).Error
}

// DeleteLead deletes a lead by ID
func DeleteLead(leadID uint) error {
    return config.DB.Delete(&Lead{}, leadID).Error
}

// LeadHasImplantedLeads checks if lead has any implanted instances
func LeadHasImplantedLeads(leadID uint) (bool, error) {
    var count int64
    err := config.DB.Model(&ImplantedLead{}).Where("lead_id = ?", leadID).Count(&count).Error
    return count > 0, err
}