package models

import (
	"time"

	"github.com/rogerhendricks/goReporter/internal/config"
	"gorm.io/gorm"
)

// AppointmentStatus represents the lifecycle state for an appointment entry.
type AppointmentStatus string

const (
	AppointmentStatusScheduled AppointmentStatus = "scheduled"
	AppointmentStatusCompleted AppointmentStatus = "completed"
	AppointmentStatusCancelled AppointmentStatus = "cancelled"
)

// Appointment stores patient visit metadata for scheduling.
type Appointment struct {
	ID          uint              `json:"id" gorm:"primaryKey"`
	Title       string            `json:"title" gorm:"type:varchar(200);not null"`
	Description string            `json:"description" gorm:"type:text"`
	Location    string            `json:"location" gorm:"type:varchar(255)"`
	Status      AppointmentStatus `json:"status" gorm:"type:varchar(32);default:'scheduled'"`
	StartAt     time.Time         `json:"startAt" gorm:"not null"`
	EndAt       *time.Time        `json:"endAt"`

	PatientID uint     `json:"patientId" gorm:"not null;index"`
	Patient   *Patient `json:"patient,omitempty"`

	CreatedByID uint  `json:"createdById" gorm:"not null;index"`
	CreatedBy   *User `json:"createdBy,omitempty"`

	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// AppointmentFilter captures optional query constraints for appointment lookups.
type AppointmentFilter struct {
	PatientID *uint
	StartAt   *time.Time
	EndAt     *time.Time
}

// ListAppointments returns appointments matching the filter criteria.
func ListAppointments(filter AppointmentFilter) ([]Appointment, error) {
	query := config.DB.Preload("Patient").Preload("CreatedBy")

	if filter.PatientID != nil {
		query = query.Where("patient_id = ?", *filter.PatientID)
	}

	if filter.StartAt != nil {
		query = query.Where("start_at >= ?", *filter.StartAt)
	}

	if filter.EndAt != nil {
		query = query.Where("start_at <= ?", *filter.EndAt)
	}

	var appointments []Appointment
	if err := query.Order("start_at ASC").Find(&appointments).Error; err != nil {
		return nil, err
	}
	return appointments, nil
}

// GetAppointmentByID retrieves a single appointment.
func GetAppointmentByID(id uint) (*Appointment, error) {
	var appointment Appointment
	if err := config.DB.Preload("Patient").Preload("CreatedBy").First(&appointment, id).Error; err != nil {
		return nil, err
	}
	return &appointment, nil
}

// CreateAppointment persists a new appointment entry.
func CreateAppointment(appointment *Appointment) error {
	return config.DB.Create(appointment).Error
}

// UpdateAppointment saves changes to an appointment.
func UpdateAppointment(appointment *Appointment) error {
	return config.DB.Save(appointment).Error
}

// DeleteAppointment removes an appointment by ID.
func DeleteAppointment(id uint) error {
	return config.DB.Delete(&Appointment{}, id).Error
}
