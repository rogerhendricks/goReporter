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

	appointment := models.Appointment{
		Title:       strings.TrimSpace(payload.Title),
		Description: strings.TrimSpace(payload.Description),
		Location:    strings.TrimSpace(payload.Location),
		Status:      normalizeAppointmentStatus(payload.Status),
		StartAt:     startAt,
		EndAt:       endAt,
		PatientID:   payload.PatientID,
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

	if strings.TrimSpace(payload.Title) != "" {
		appointment.Title = strings.TrimSpace(payload.Title)
	}
	if payload.Description != "" {
		appointment.Description = strings.TrimSpace(payload.Description)
	}
	if payload.Location != "" {
		appointment.Location = strings.TrimSpace(payload.Location)
	}
	if payload.Status != "" {
		appointment.Status = normalizeAppointmentStatus(payload.Status)
	}
	if payload.StartAt != "" {
		parsedStart, parseErr := parseFlexibleTime(payload.StartAt)
		if parseErr != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "startAt must be a valid ISO date"})
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
	case "admin", "user":
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
