package models

import (
	"gorm.io/gorm"
)

type PatientNote struct {
	gorm.Model
	PatientID uint   `json:"patientId" gorm:"not null;index"`
	UserID    uint   `json:"userId" gorm:"not null"`
	Content   string `json:"content" gorm:"type:text;not null"`

	// Relationships
	Patient Patient `json:"patient,omitempty" gorm:"foreignKey:PatientID;constraint:OnDelete:CASCADE"`
	User    User    `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnDelete:SET NULL"`
}
