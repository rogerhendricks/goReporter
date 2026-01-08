package models

import (
	"errors"
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

// AppointmentLocation represents the allowed location types for appointments.
type AppointmentLocation string

const (
	AppointmentLocationRemote    AppointmentLocation = "remote"
	AppointmentLocationTelevisit AppointmentLocation = "televisit"
	AppointmentLocationClinic    AppointmentLocation = "clinic"
)

// AppointmentSlot represents a time slot for clinic appointments.
type AppointmentSlot struct {
	ID          uint                `json:"id" gorm:"primaryKey"`
	SlotTime    time.Time           `json:"slotTime" gorm:"not null;uniqueIndex:idx_slot_time_location"`
	Location    AppointmentLocation `json:"location" gorm:"type:varchar(32);not null;default:'clinic';uniqueIndex:idx_slot_time_location"`
	MaxCapacity int                 `json:"maxCapacity" gorm:"not null;default:4"`
	BookedCount int                 `json:"bookedCount" gorm:"not null;default:0"`
	CreatedAt   time.Time           `json:"createdAt"`
	UpdatedAt   time.Time           `json:"updatedAt"`
}

// Appointment stores patient visit metadata for scheduling.
type Appointment struct {
	ID          uint                `json:"id" gorm:"primaryKey"`
	Title       string              `json:"title" gorm:"type:varchar(200);not null"`
	Description string              `json:"description" gorm:"type:text"`
	Location    AppointmentLocation `json:"location" gorm:"type:varchar(32)"`
	Status      AppointmentStatus   `json:"status" gorm:"type:varchar(32);default:'scheduled'"`
	StartAt     time.Time           `json:"startAt" gorm:"not null"`
	EndAt       *time.Time          `json:"endAt"`

	PatientID uint     `json:"patientId" gorm:"not null;index"`
	Patient   *Patient `json:"patient,omitempty"`

	SlotID *uint            `json:"slotId,omitempty" gorm:"index"`
	Slot   *AppointmentSlot `json:"slot,omitempty"`

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

// GetOrCreateSlot finds or creates a slot for the given time and location.
func GetOrCreateSlot(slotTime time.Time, location AppointmentLocation) (*AppointmentSlot, error) {
	// Round to nearest 15-minute interval
	roundedTime := roundToNearestSlot(slotTime)

	var slot AppointmentSlot
	err := config.DB.Where("slot_time = ? AND location = ?", roundedTime, location).First(&slot).Error

	if err == nil {
		return &slot, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create new slot
	slot = AppointmentSlot{
		SlotTime:    roundedTime,
		Location:    location,
		MaxCapacity: 4,
		BookedCount: 0,
	}

	if err := config.DB.Create(&slot).Error; err != nil {
		return nil, err
	}

	return &slot, nil
}

// CheckSlotAvailability checks if a slot has available capacity.
func CheckSlotAvailability(slotTime time.Time, location AppointmentLocation) (bool, int, error) {
	if location != AppointmentLocationClinic {
		// Non-clinic locations don't use slots
		return true, -1, nil
	}

	roundedTime := roundToNearestSlot(slotTime)

	var slot AppointmentSlot
	err := config.DB.Where("slot_time = ? AND location = ?", roundedTime, location).First(&slot).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Slot doesn't exist yet, so it's available
		return true, 4, nil
	}

	if err != nil {
		return false, 0, err
	}

	available := slot.BookedCount < slot.MaxCapacity
	remaining := slot.MaxCapacity - slot.BookedCount
	return available, remaining, nil
}

// IncrementSlotBooking increments the booked count for a slot.
func IncrementSlotBooking(slotID uint) error {
	return config.DB.Model(&AppointmentSlot{}).
		Where("id = ? AND booked_count < max_capacity", slotID).
		Update("booked_count", gorm.Expr("booked_count + 1")).Error
}

// DecrementSlotBooking decrements the booked count for a slot.
func DecrementSlotBooking(slotID uint) error {
	return config.DB.Model(&AppointmentSlot{}).
		Where("id = ? AND booked_count > 0", slotID).
		Update("booked_count", gorm.Expr("booked_count - 1")).Error
}

// GetAvailableSlots returns available slots for a date range.
func GetAvailableSlots(start, end time.Time, location AppointmentLocation) ([]AppointmentSlot, error) {
	var slots []AppointmentSlot
	err := config.DB.Where("slot_time >= ? AND slot_time < ? AND location = ?", start, end, location).
		Order("slot_time ASC").
		Find(&slots).Error
	return slots, err
}

// RoundToNearestSlot rounds a time to the nearest 15-minute interval.
func RoundToNearestSlot(t time.Time) time.Time {
	minutes := t.Minute()
	roundedMinutes := (minutes / 15) * 15
	return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), roundedMinutes, 0, 0, t.Location())
}

// roundToNearestSlot is the internal version (kept for backwards compatibility)
func roundToNearestSlot(t time.Time) time.Time {
	return RoundToNearestSlot(t)
}
