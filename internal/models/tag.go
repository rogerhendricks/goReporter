package models

import "gorm.io/gorm"

type Tag struct {
	gorm.Model
	Name        string    `json:"name" gorm:"type:varchar(100);uniqueIndex;not null"`
	Color       string    `json:"color" gorm:"type:varchar(20);default:'#808080'"`
	Description string    `json:"description" gorm:"type:text"`
	Patients    []Patient `json:"patients" gorm:"many2many:patient_tags;"`
	Reports     []Report  `json:"reports" gorm:"many2many:report_tags;"`
}
