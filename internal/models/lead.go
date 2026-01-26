package models

import (
	"strings"

	"github.com/rogerhendricks/goReporter/internal/config"
	"gorm.io/gorm"
)

type Lead struct {
	gorm.Model
	Name         string          `json:"name" gorm:"type:varchar(255);not null"`
	Manufacturer string          `json:"manufacturer" gorm:"type:varchar(255)"`
	LeadModel    string          `json:"leadModel" gorm:"type:varchar(50)"`
	IsMri        bool            `json:"isMri" gorm:"default:false"`
	HasAlert     bool            `json:"hasAlert" gorm:"default:false"`
	Connector    string          `json:"connector" gorm:"type:varchar(50)"`
	Polarity     string          `json:"polarity" gorm:"type:varchar(100)"`
	Implanted    []ImplantedLead `json:"implanted" gorm:"foreignKey:LeadID"`
}

// GetAllLeads retrieves all leads
func GetAllLeads() ([]Lead, error) {
	var leads []Lead
	err := config.DB.Find(&leads).Error
	if err != nil {
		return []Lead{}, err // Return empty slice instead of nil
	}
	return leads, err
}

func GetAllLeadsBySearch(query string) ([]Lead, error) {
	var leads []Lead
	tx := config.DB

	if query != "" {
		searchQuery := "%" + strings.ToLower(query) + "%"
		tx = tx.Where("LOWER(name) LIKE ? OR LOWER(manufacturer) LIKE ? OR LOWER(lead_model) LIKE ?", searchQuery, searchQuery, searchQuery)
	}

	err := tx.Find(&leads).Error
	if err != nil {
		return []Lead{}, err // Return empty slice instead of nil
	}
	return leads, nil
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

// GetLeadsPaginated retrieves leads with pagination and search
func GetLeadsPaginated(search string, page, limit int) ([]Lead, int64, error) {
	var leads []Lead
	var total int64

	tx := config.DB.Model(&Lead{})

	// Apply search filter if provided
	if search != "" {
		searchQuery := "%" + strings.ToLower(search) + "%"
		tx = tx.Where("LOWER(name) LIKE ? OR LOWER(manufacturer) LIKE ? OR LOWER(lead_model) LIKE ?",
			searchQuery, searchQuery, searchQuery)
	}

	// Get total count
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * limit
	err := tx.Offset(offset).Limit(limit).Order("name ASC").Find(&leads).Error
	if err != nil {
		return nil, 0, err
	}

	return leads, total, nil
}
