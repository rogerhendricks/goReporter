package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
	"gorm.io/gorm"
)

type appointmentRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Location    string  `json:"location"`
	Status      string  `json:"status"`
	StartAt     string  `json:"startAt"`
	EndAt       *string `json:"endAt"`
	PatientID   uint    `json:"patientId"`
}

var allowedAppointmentStatuses = map[models.AppointmentStatus]struct{}{
	models.AppointmentStatusScheduled: {},
	models.AppointmentStatusCompleted: {},
	models.AppointmentStatusCancelled: {},
}

var allowedAppointmentLocations = map[models.AppointmentLocation]struct{}{
	models.AppointmentLocationRemote:    {},
	models.AppointmentLocationTelevisit: {},
	models.AppointmentLocationClinic:    {},
}

// GetAppointments returns appointments across patients with optional filters.
func GetAppointments(c *fiber.Ctx) error {
	userID, userRole, err := resolveUserContext(c)
	if err != nil {
		return err
	}

	query := config.DB.Preload("Patient").Preload("CreatedBy")

	if patientParam := c.Query("patientId"); patientParam != "" {
		pid, convErr := strconv.Atoi(patientParam)
		if convErr != nil || pid <= 0 {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patientId"})
		}
		query = query.Where("patient_id = ?", pid)
		allowed, accessErr := canAccessPatient(userRole, userID, uint(pid))
		if accessErr != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify permissions"})
		}
		if !allowed {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied for this patient"})
		}
	} else if userRole == "doctor" {
		// Limit doctors to appointments for their panel of patients
		query = query.Joins("JOIN patient_doctors ON patient_doctors.patient_id = appointments.patient_id").
			Joins("JOIN doctors ON doctors.id = patient_doctors.doctor_id").
			Where("doctors.user_id = ?", userID)
	}

	if startParam := c.Query("start"); startParam != "" {
		if parsed, parseErr := parseFlexibleTime(startParam); parseErr == nil {
			query = query.Where("start_at >= ?", parsed)
		} else {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid start date filter"})
		}
	}

	if endParam := c.Query("end"); endParam != "" {
		if parsed, parseErr := parseFlexibleTime(endParam); parseErr == nil {
			query = query.Where("start_at <= ?", parsed)
		} else {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid end date filter"})
		}
	}

	var appointments []models.Appointment
	if err := query.Order("start_at ASC").Find(&appointments).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load appointments"})
	}

	return c.JSON(appointments)
}

// GetPatientAppointments returns appointments scoped to a single patient.
func GetPatientAppointments(c *fiber.Ctx) error {
	userID, userRole, err := resolveUserContext(c)
	if err != nil {
		return err
	}

	patientID, err := strconv.Atoi(c.Params("patientId"))
	if err != nil || patientID <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patient id"})
	}

	allowed, accessErr := canAccessPatient(userRole, userID, uint(patientID))
	if accessErr != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify permissions"})
	}
	if !allowed {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var appointments []models.Appointment
	if err := config.DB.Preload("Patient").Preload("CreatedBy").
		Where("patient_id = ?", patientID).
		Order("start_at ASC").
		Find(&appointments).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load appointments"})
	}

	return c.JSON(appointments)
}

// GetAppointment retrieves a single appointment entry.
func GetAppointment(c *fiber.Ctx) error {
	userID, userRole, err := resolveUserContext(c)
	if err != nil {
		return err
	}

	appointmentID, err := strconv.Atoi(c.Params("id"))
	if err != nil || appointmentID <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid appointment id"})
	}

	appointment, err := models.GetAppointmentByID(uint(appointmentID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Appointment not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load appointment"})
	}

	allowed, accessErr := canAccessPatient(userRole, userID, appointment.PatientID)
	if accessErr != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify permissions"})
	}
	if !allowed {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	return c.JSON(appointment)
}

// CreateAppointment stores a new appointment entry.
func CreateAppointment(c *fiber.Ctx) error {
	userID, userRole, err := resolveUserContext(c)
	if err != nil {
		return err
	}

	var payload appointmentRequest
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if strings.TrimSpace(payload.Title) == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Title is required"})
	}

	if payload.PatientID == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "patientId is required"})
	}

	startAt, err := parseFlexibleTime(payload.StartAt)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "startAt must be a valid ISO date"})
	}

	var endAt *time.Time
	if payload.EndAt != nil && strings.TrimSpace(*payload.EndAt) != "" {
		parsedEnd, parseErr := parseFlexibleTime(*payload.EndAt)
		if parseErr != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "endAt must be a valid ISO date"})
		}
		if parsedEnd.Before(startAt) {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "endAt must be after startAt"})
		}
		endAt = &parsedEnd
	}

	allowed, accessErr := canAccessPatient(userRole, userID, payload.PatientID)
	if accessErr != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify permissions"})
	}
	if !allowed {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	location := normalizeAppointmentLocation(payload.Location)

	// Check slot availability for clinic appointments
	var slotID *uint
	if location == models.AppointmentLocationClinic {
		// Validate time is within allowed hours (8:00 AM - 11:30 AM)
		// Convert to Sydney timezone for validation
		sydneyLoc, err := time.LoadLocation("Australia/Sydney")
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load timezone"})
		}
		localTime := startAt.In(sydneyLoc)
		hour := localTime.Hour()
		minute := localTime.Minute()

		if hour < 8 || hour > 11 || (hour == 11 && minute > 30) {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "Clinic appointments are only available between 8:00 AM and 11:30 AM (Sydney time)",
				"code":  "INVALID_TIME",
			})
		}

		available, remaining, err := models.CheckSlotAvailability(startAt, location)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check slot availability"})
		}
		if !available {
			return c.Status(http.StatusConflict).JSON(fiber.Map{
				"error": "No available slots for this time",
				"code":  "SLOT_FULL",
			})
		}

		// Get or create the slot
		slot, err := models.GetOrCreateSlot(startAt, location)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to reserve slot"})
		}

		// Increment the booking count
		if err := models.IncrementSlotBooking(slot.ID); err != nil {
			return c.Status(http.StatusConflict).JSON(fiber.Map{
				"error": "Failed to reserve slot - may be full",
				"code":  "SLOT_BOOKING_FAILED",
			})
		}

		slotID = &slot.ID

		// Set end time to 15 minutes after start for clinic appointments if not specified
		if endAt == nil {
			endTime := startAt.Add(15 * time.Minute)
			endAt = &endTime
		}

		// Return slot availability info
		c.Append("X-Slot-Remaining", strconv.Itoa(remaining-1))
	}

	appointment := models.Appointment{
		Title:       strings.TrimSpace(payload.Title),
		Description: strings.TrimSpace(payload.Description),
		Location:    location,
		Status:      normalizeAppointmentStatus(payload.Status),
		StartAt:     startAt,
		EndAt:       endAt,
		PatientID:   payload.PatientID,
		SlotID:      slotID,
		CreatedByID: userID,
	}

	if err := models.CreateAppointment(&appointment); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create appointment"})
	}

	created, _ := models.GetAppointmentByID(appointment.ID)
	return c.Status(http.StatusCreated).JSON(created)
}

// UpdateAppointment modifies an existing appointment entry.
func UpdateAppointment(c *fiber.Ctx) error {
	userID, userRole, err := resolveUserContext(c)
	if err != nil {
		return err
	}

	appointmentID, err := strconv.Atoi(c.Params("id"))
	if err != nil || appointmentID <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid appointment id"})
	}

	appointment, err := models.GetAppointmentByID(uint(appointmentID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Appointment not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load appointment"})
	}

	allowed, accessErr := canAccessPatient(userRole, userID, appointment.PatientID)
	if accessErr != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify permissions"})
	}
	if !allowed {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var payload appointmentRequest
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Track if we need to update slots
	oldSlotID := appointment.SlotID
	oldLocation := appointment.Location
	locationChanged := false
	timeChanged := false

	if strings.TrimSpace(payload.Title) != "" {
		appointment.Title = strings.TrimSpace(payload.Title)
	}
	if payload.Description != "" {
		appointment.Description = strings.TrimSpace(payload.Description)
	}
	if payload.Location != "" {
		newLocation := normalizeAppointmentLocation(payload.Location)
		if newLocation != appointment.Location {
			locationChanged = true
		}
		appointment.Location = newLocation
	}
	if payload.Status != "" {
		appointment.Status = normalizeAppointmentStatus(payload.Status)
	}
	if payload.StartAt != "" {
		parsedStart, parseErr := parseFlexibleTime(payload.StartAt)
		if parseErr != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "startAt must be a valid ISO date"})
		}
		if !parsedStart.Equal(appointment.StartAt) {
			timeChanged = true
		}
		appointment.StartAt = parsedStart
	}
	if payload.EndAt != nil {
		if strings.TrimSpace(*payload.EndAt) == "" {
			appointment.EndAt = nil
		} else {
			parsedEnd, parseErr := parseFlexibleTime(*payload.EndAt)
			if parseErr != nil {
				return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "endAt must be a valid ISO date"})
			}
			if parsedEnd.Before(appointment.StartAt) {
				return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "endAt must be after startAt"})
			}
			appointment.EndAt = &parsedEnd
		}
	}

	// Handle slot changes for clinic appointments
	if locationChanged || timeChanged {
		// Release old slot if it was a clinic appointment
		if oldLocation == models.AppointmentLocationClinic && oldSlotID != nil {
			_ = models.DecrementSlotBooking(*oldSlotID)
		}

		// Book new slot if new location is clinic
		if appointment.Location == models.AppointmentLocationClinic {
			// Validate time is within allowed hours (8:00 AM - 11:30 AM)
			// Convert to Sydney timezone for validation
			sydneyLoc, err := time.LoadLocation("Australia/Sydney")
			if err != nil {
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load timezone"})
			}
			localTime := appointment.StartAt.In(sydneyLoc)
			hour := localTime.Hour()
			minute := localTime.Minute()

			if hour < 8 || hour > 11 || (hour == 11 && minute > 30) {
				// Restore old slot booking if we released it
				if oldLocation == models.AppointmentLocationClinic && oldSlotID != nil {
					_ = models.IncrementSlotBooking(*oldSlotID)
				}
				return c.Status(http.StatusBadRequest).JSON(fiber.Map{
					"error": "Clinic appointments are only available between 8:00 AM and 11:30 AM (Sydney time)",
					"code":  "INVALID_TIME",
				})
			}

			available, remaining, err := models.CheckSlotAvailability(appointment.StartAt, appointment.Location)
			if err != nil {
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check slot availability"})
			}
			if !available {
				// Restore old slot booking if we released it
				if oldLocation == models.AppointmentLocationClinic && oldSlotID != nil {
					_ = models.IncrementSlotBooking(*oldSlotID)
				}
				return c.Status(http.StatusConflict).JSON(fiber.Map{
					"error": "No available slots for this time",
					"code":  "SLOT_FULL",
				})
			}

			slot, err := models.GetOrCreateSlot(appointment.StartAt, appointment.Location)
			if err != nil {
				// Restore old slot booking if we released it
				if oldLocation == models.AppointmentLocationClinic && oldSlotID != nil {
					_ = models.IncrementSlotBooking(*oldSlotID)
				}
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to reserve slot"})
			}

			if err := models.IncrementSlotBooking(slot.ID); err != nil {
				// Restore old slot booking if we released it
				if oldLocation == models.AppointmentLocationClinic && oldSlotID != nil {
					_ = models.IncrementSlotBooking(*oldSlotID)
				}
				return c.Status(http.StatusConflict).JSON(fiber.Map{
					"error": "Failed to reserve slot - may be full",
					"code":  "SLOT_BOOKING_FAILED",
				})
			}

			appointment.SlotID = &slot.ID
			c.Append("X-Slot-Remaining", strconv.Itoa(remaining-1))

			// Set end time to 15 minutes for clinic appointments if not already set
			if appointment.EndAt == nil {
				endTime := appointment.StartAt.Add(15 * time.Minute)
				appointment.EndAt = &endTime
			}
		} else {
			// Not a clinic appointment, clear slot
			appointment.SlotID = nil
		}
	}

	// Allow changing patient association with permission check
	if payload.PatientID != 0 && payload.PatientID != appointment.PatientID {
		allowed, accessErr := canAccessPatient(userRole, userID, payload.PatientID)
		if accessErr != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify permissions"})
		}
		if !allowed {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied for new patient"})
		}
		appointment.PatientID = payload.PatientID
	}

	if err := models.UpdateAppointment(appointment); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update appointment"})
	}

	updated, _ := models.GetAppointmentByID(appointment.ID)
	return c.JSON(updated)
}

// GetAvailableSlots returns available appointment slots for a date range.
func GetAvailableSlots(c *fiber.Ctx) error {
	startParam := c.Query("start")
	endParam := c.Query("end")
	locationParam := c.Query("location", "clinic")

	if startParam == "" || endParam == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "start and end query parameters are required"})
	}

	start, err := time.Parse(time.RFC3339, startParam)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "start must be a valid ISO date"})
	}

	end, err := time.Parse(time.RFC3339, endParam)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "end must be a valid ISO date"})
	}

	location := normalizeAppointmentLocation(locationParam)

	// Only clinic appointments use slots
	if location != models.AppointmentLocationClinic {
		return c.JSON(fiber.Map{
			"message": "Non-clinic appointments don't use slot system",
			"slots":   []interface{}{},
		})
	}

	slots, err := models.GetAvailableSlots(start, end, location)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch available slots"})
	}

	// Create a map of existing slots by time for quick lookup
	slotMap := make(map[string]models.AppointmentSlot)
	for _, slot := range slots {
		key := slot.SlotTime.Format(time.RFC3339)
		slotMap[key] = slot
	}

	// Generate all possible 15-minute slots for the date range
	type SlotResponse struct {
		SlotTime  time.Time `json:"slotTime"`
		Remaining int       `json:"remaining"`
		Total     int       `json:"total"`
	}

	var response []SlotResponse
	current := models.RoundToNearestSlot(start)

	// Load Sydney timezone for validation
	sydneyLoc, err := time.LoadLocation("Australia/Sydney")
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load timezone"})
	}

	for current.Before(end) {
		// Restrict clinic slots to 8:00 AM - 11:30 AM (Sydney time)
		localTime := current.In(sydneyLoc)
		hour := localTime.Hour()
		minute := localTime.Minute()

		// Skip slots outside 8:00-11:30 time window
		if hour < 8 || hour > 11 || (hour == 11 && minute > 30) {
			current = current.Add(15 * time.Minute)
			continue
		}

		key := current.Format(time.RFC3339)

		if slot, exists := slotMap[key]; exists {
			// Slot exists in database - use actual data
			remaining := slot.MaxCapacity - slot.BookedCount
			// Return all slots, even if full, so frontend can show appropriate message
			response = append(response, SlotResponse{
				SlotTime:  slot.SlotTime,
				Remaining: remaining,
				Total:     slot.MaxCapacity,
			})
		} else {
			// Slot doesn't exist yet - all 4 available
			response = append(response, SlotResponse{
				SlotTime:  current,
				Remaining: 4,
				Total:     4,
			})
		}

		current = current.Add(15 * time.Minute)
	}

	return c.JSON(response)
}

// DeleteAppointment removes an appointment permanently.
func DeleteAppointment(c *fiber.Ctx) error {
	userID, userRole, err := resolveUserContext(c)
	if err != nil {
		return err
	}

	appointmentID, err := strconv.Atoi(c.Params("id"))
	if err != nil || appointmentID <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid appointment id"})
	}

	appointment, err := models.GetAppointmentByID(uint(appointmentID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Appointment not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load appointment"})
	}

	allowed, accessErr := canAccessPatient(userRole, userID, appointment.PatientID)
	if accessErr != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify permissions"})
	}
	if !allowed {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	// Release slot if this was a clinic appointment
	if appointment.Location == models.AppointmentLocationClinic && appointment.SlotID != nil {
		_ = models.DecrementSlotBooking(*appointment.SlotID)
	}

	if err := models.DeleteAppointment(appointment.ID); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete appointment"})
	}

	return c.SendStatus(http.StatusNoContent)
}

func resolveUserContext(c *fiber.Ctx) (uint, string, error) {
	userIDVal := c.Locals("user_id")
	userRoleVal := c.Locals("user_role")

	userID, ok := userIDVal.(uint)
	if !ok {
		return 0, "", c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user session"})
	}

	role, ok := userRoleVal.(string)
	if !ok {
		return 0, "", c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user role"})
	}

	return userID, role, nil
}

func canAccessPatient(userRole string, userID uint, patientID uint) (bool, error) {
	switch userRole {
	case "admin", "user", "viewer":
		return true, nil
	case "doctor":
		return models.IsDoctorAssociatedWithPatient(userID, patientID)
	default:
		return false, nil
	}
}

func normalizeAppointmentStatus(status string) models.AppointmentStatus {
	normalized := models.AppointmentStatus(strings.ToLower(strings.TrimSpace(status)))
	if _, ok := allowedAppointmentStatuses[normalized]; ok {
		return normalized
	}
	return models.AppointmentStatusScheduled
}

func normalizeAppointmentLocation(location string) models.AppointmentLocation {
	normalized := models.AppointmentLocation(strings.ToLower(strings.TrimSpace(location)))
	if _, ok := allowedAppointmentLocations[normalized]; ok {
		return normalized
	}
	return models.AppointmentLocationClinic // Default to clinic
}

func parseFlexibleTime(value string) (time.Time, error) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04",
		"2006-01-02 15:04",
		"2006-01-02",
	}

	trimmed := strings.TrimSpace(value)
	var parseErr error
	for _, layout := range layouts {
		if t, err := time.Parse(layout, trimmed); err == nil {
			return t, nil
		} else {
			parseErr = err
		}
	}
	return time.Time{}, parseErr
}
