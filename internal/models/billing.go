package models

import (
	"strings"

	"github.com/rogerhendricks/goReporter/internal/config"
	"gorm.io/gorm"
)

// BillingCode model stores alphanumeric billing codes associated with device encounter categories.
type BillingCode struct {
	gorm.Model
	Category string `json:"category" gorm:"type:varchar(100);uniqueIndex;not null"` // e.g., "in clinic pacemaker"
	Code     string `json:"code" gorm:"type:varchar(50);not null"`
}

// GetAllBillingCodes retrieves all existing billing codes.
func GetAllBillingCodes() ([]BillingCode, error) {
	var codes []BillingCode
	err := config.DB.Order("category ASC").Find(&codes).Error
	return codes, err
}

// UpdateBillingCode creates or updates a billing code by category.
func UpdateBillingCode(category string, code string) (*BillingCode, error) {
	var bc BillingCode
	category = strings.ToLower(strings.TrimSpace(category))

	err := config.DB.Where("category = ?", category).First(&bc).Error
	if err != nil && err == gorm.ErrRecordNotFound {
		// Create new
		bc = BillingCode{
			Category: category,
			Code:     code,
		}
		err = config.DB.Create(&bc).Error
		return &bc, err
	} else if err != nil {
		return nil, err
	}

	// Update existing
	bc.Code = code
	err = config.DB.Save(&bc).Error
	return &bc, err
}
