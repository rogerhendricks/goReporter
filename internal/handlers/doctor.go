package handlers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/models"
    "github.com/rogerhendricks/goReporter/internal/utils"
    "net/http"
    "log"
    "strings"
    "html"
    "errors"
    "gorm.io/gorm"
    "strconv"
    "regexp"
)

// GetDoctors retrieves all doctors
func GetDoctors(c *fiber.Ctx) error {
    // Check if user has appropriate permissions
    userID := c.Locals("userID").(string)
    _, err := models.GetUserByID(userID)
    if err != nil {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
    }

    doctors, err := models.GetAllDoctors()
    if err != nil {
        log.Printf("Error fetching doctors: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch doctors"})
    }

    return c.JSON(doctors)
}

// GetDoctor retrieves a specific doctor by ID
func GetDoctor(c *fiber.Ctx) error {
    doctorID := c.Params("id")
    
    // Validate ID format
    id, err := strconv.ParseUint(doctorID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid doctor ID format"})
    }

    doctor, err := models.GetDoctorByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Doctor not found"})
        }
        log.Printf("Error fetching doctor %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    return c.JSON(doctor)
}

// CreateDoctor creates a new doctor with addresses
func CreateDoctor(c *fiber.Ctx) error {
    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }

    var newDoctor models.Doctor
    if err := c.BodyParser(&newDoctor); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }

    // Validate input
    if err := validateDoctor(&newDoctor); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // Sanitize input
    sanitizeDoctor(&newDoctor)

    // Validate and sanitize addresses
    if err := validateAddresses(newDoctor.Addresses); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    sanitizeAddresses(newDoctor.Addresses)

    // Create doctor in database
    if err := models.CreateDoctor(&newDoctor); err != nil {
        log.Printf("Error creating doctor: %v", err)
        if strings.Contains(err.Error(), "duplicate") {
            return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Doctor with this email or license number already exists"})
        }
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create doctor"})
    }

    return c.Status(http.StatusCreated).JSON(newDoctor)
}

// UpdateDoctor updates an existing doctor
func UpdateDoctor(c *fiber.Ctx) error {
    doctorID := c.Params("id")
    
    // Validate ID format
    id, err := strconv.ParseUint(doctorID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid doctor ID format"})
    }

    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }

    var updateData models.Doctor
    if err := c.BodyParser(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }

    // Get existing doctor
    existingDoctor, err := models.GetDoctorByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Doctor not found"})
        }
        log.Printf("Error fetching doctor %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    // Validate input
    if err := validateDoctorUpdate(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // Update fields if provided
    updateDoctorFields(existingDoctor, &updateData)

    // Update doctor
    if err := models.UpdateDoctor(existingDoctor); err != nil {
        log.Printf("Error updating doctor %d: %v", id, err)
        if strings.Contains(err.Error(), "duplicate") {
            return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Email or license number already exists"})
        }
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update doctor"})
    }

    // Update addresses if provided
    if len(updateData.Addresses) > 0 {
        if err := validateAddresses(updateData.Addresses); err != nil {
            return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
        }
        sanitizeAddresses(updateData.Addresses)
        
        if err := models.UpdateDoctorAddresses(uint(id), updateData.Addresses); err != nil {
            log.Printf("Error updating doctor addresses %d: %v", id, err)
            return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update addresses"})
        }
    }

    // Get updated doctor with addresses
    updatedDoctor, err := models.GetDoctorByID(uint(id))
    if err != nil {
        log.Printf("Error fetching updated doctor %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    return c.JSON(updatedDoctor)
}

// DeleteDoctor removes a doctor
func DeleteDoctor(c *fiber.Ctx) error {
    doctorID := c.Params("id")
    
    // Validate ID format
    id, err := strconv.ParseUint(doctorID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid doctor ID format"})
    }

    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }

    // Check if doctor exists
    _, err = models.GetDoctorByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Doctor not found"})
        }
        log.Printf("Error fetching doctor %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    // Check if doctor has reports
    hasReports, err := models.DoctorHasReports(uint(id))
    if err != nil {
        log.Printf("Error checking reports for doctor %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    if hasReports {
        return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Cannot delete doctor that has associated reports"})
    }

    if err := models.DeleteDoctor(uint(id)); err != nil {
        log.Printf("Error deleting doctor %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete doctor"})
    }

    return c.SendStatus(http.StatusNoContent)
}

// Validation functions
func validateDoctor(doctor *models.Doctor) error {
    if strings.TrimSpace(doctor.FirstName) == "" {
        return errors.New("first name is required")
    }
    if strings.TrimSpace(doctor.LastName) == "" {
        return errors.New("last name is required")
    }
    if doctor.Email != "" && !utils.IsValidEmail(doctor.Email) {
        return errors.New("invalid email format")
    }
    if doctor.Phone != "" && !isValidPhone(doctor.Phone) {
        return errors.New("invalid phone number format")
    }
    if strings.TrimSpace(doctor.LicenseNum) == "" {
        return errors.New("license number is required")
    }
    return nil
}

func validateDoctorUpdate(doctor *models.Doctor) error {
    if doctor.Email != "" && !utils.IsValidEmail(doctor.Email) {
        return errors.New("invalid email format")
    }
    if doctor.Phone != "" && !isValidPhone(doctor.Phone) {
        return errors.New("invalid phone number format")
    }
    return nil
}

func validateAddresses(addresses []models.Address) error {
    for i, addr := range addresses {
        if strings.TrimSpace(addr.Street) == "" {
            return errors.New("street is required for address " + strconv.Itoa(i+1))
        }
        if strings.TrimSpace(addr.City) == "" {
            return errors.New("city is required for address " + strconv.Itoa(i+1))
        }
        if strings.TrimSpace(addr.State) == "" {
            return errors.New("state is required for address " + strconv.Itoa(i+1))
        }
        if strings.TrimSpace(addr.Zip) == "" {
            return errors.New("zip code is required for address " + strconv.Itoa(i+1))
        }
        if !isValidZip(addr.Zip) {
            return errors.New("invalid zip code format for address " + strconv.Itoa(i+1))
        }
    }
    return nil
}

// Sanitization functions
func sanitizeDoctor(doctor *models.Doctor) {
    doctor.FirstName = html.EscapeString(strings.TrimSpace(doctor.FirstName))
    doctor.LastName = html.EscapeString(strings.TrimSpace(doctor.LastName))
    doctor.Email = html.EscapeString(strings.TrimSpace(doctor.Email))
    doctor.Phone = html.EscapeString(strings.TrimSpace(doctor.Phone))
    doctor.Specialty = html.EscapeString(strings.TrimSpace(doctor.Specialty))
    doctor.LicenseNum = html.EscapeString(strings.TrimSpace(doctor.LicenseNum))
}

func sanitizeAddresses(addresses []models.Address) {
    for i := range addresses {
        addresses[i].Street = html.EscapeString(strings.TrimSpace(addresses[i].Street))
        addresses[i].City = html.EscapeString(strings.TrimSpace(addresses[i].City))
        addresses[i].State = html.EscapeString(strings.TrimSpace(addresses[i].State))
        addresses[i].Zip = html.EscapeString(strings.TrimSpace(addresses[i].Zip))
    }
}

func updateDoctorFields(existing *models.Doctor, update *models.Doctor) {
    if update.FirstName != "" {
        existing.FirstName = html.EscapeString(strings.TrimSpace(update.FirstName))
    }
    if update.LastName != "" {
        existing.LastName = html.EscapeString(strings.TrimSpace(update.LastName))
    }
    if update.Email != "" {
        existing.Email = html.EscapeString(strings.TrimSpace(update.Email))
    }
    if update.Phone != "" {
        existing.Phone = html.EscapeString(strings.TrimSpace(update.Phone))
    }
    if update.Specialty != "" {
        existing.Specialty = html.EscapeString(strings.TrimSpace(update.Specialty))
    }
    if update.LicenseNum != "" {
        existing.LicenseNum = html.EscapeString(strings.TrimSpace(update.LicenseNum))
    }
}

// Helper validation functions
func isValidPhone(phone string) bool {
    phoneRegex := regexp.MustCompile(`^\+?[\d\s\-\(\)]{10,20}$`)
    return phoneRegex.MatchString(phone)
}

func isValidZip(zip string) bool {
    zipRegex := regexp.MustCompile(`^\d{5}(-\d{4})?$`)
    return zipRegex.MatchString(zip)
}