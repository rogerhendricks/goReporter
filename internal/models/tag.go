package models

import "gorm.io/gorm"

type Tag struct {
	gorm.Model
	Name        string    `json:"name" gorm:"type:varchar(100);not null;uniqueIndex:idx_tag_name_type"`
	Type        string    `json:"type" gorm:"type:varchar(50);not null;default:'patient';uniqueIndex:idx_tag_name_type"`
	Color       string    `json:"color" gorm:"type:varchar(20);default:'#808080'"`
	Description string    `json:"description" gorm:"type:text"`
	Patients    []Patient `json:"patients" gorm:"many2many:patient_tags;"`
	Reports     []Report  `json:"reports" gorm:"many2many:report_tags;"`
}

// Before creating, ensure unique constraint is maintained properly
func (t *Tag) BeforeCreate(tx *gorm.DB) error {
	// The unique index idx_tag_name_type ensures uniqueness of name+type combination
	return nil
}
