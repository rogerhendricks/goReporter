package handlers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/models"
    "github.com/rogerhendricks/goReporter/internal/utils"
    "github.com/rogerhendricks/goReporter/internal/config"
    "net/http"
    "log"
    "strings"
    "html"
    "errors"
    "gorm.io/gorm"
    "strconv"
    "time"
)

// GetPatients retrieves all patients with optional search
func GetPatients(c *fiber.Ctx) error {
    searchQuery := c.Query("search")
    
    var patients []models.Patient
    var err error
    
    if searchQuery != "" {
        patients, err = models.SearchPatients(searchQuery)
    } else {
        patients, err = models.GetAllPatients()
    }
    
    if err != nil {
        log.Printf("Error fetching patients: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
    }
    
    return c.JSON(patients)
}

// GetAllPatients retrieves all patients (alternative endpoint)
func GetAllPatients(c *fiber.Ctx) error {
    patients, err := models.GetAllPatients()
    if err != nil {
        log.Printf("Error fetching all patients: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
    }
    
    return c.JSON(patients)
}

// GetPatient retrieves a specific patient by ID
func GetPatient(c *fiber.Ctx) error {
    patientID := c.Params("id")
    
    id, err := strconv.ParseUint(patientID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patient ID format"})
    }
    
    patient, err := models.GetPatientByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Patient not found"})
        }
        log.Printf("Error fetching patient %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    return c.JSON(patient)
}

// CreatePatient creates a new patient
func CreatePatient(c *fiber.Ctx) error {
    var newPatient models.Patient
    if err := c.BodyParser(&newPatient); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }
    
    // Validate input
    if err := validatePatient(&newPatient); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    
    // Sanitize input
    sanitizePatient(&newPatient)
    
    // Handle relationships separately to avoid GORM issues
    patientDoctors := newPatient.PatientDoctors
    implantedDevices := newPatient.ImplantedDevices
    implantedLeads := newPatient.ImplantedLeads
    
    // Clear relationships for initial creation
    newPatient.PatientDoctors = nil
    newPatient.ImplantedDevices = nil
    newPatient.ImplantedLeads = nil
    
    // Create patient first
    if err := models.CreatePatient(&newPatient); err != nil {
        log.Printf("Error creating patient: %v", err)
        if strings.Contains(err.Error(), "duplicate") {
            return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Patient with this MRN already exists"})
        }
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create patient"})
    }
    
    // Add relationships after patient creation
    if err := createPatientRelationships(newPatient.ID, patientDoctors, implantedDevices, implantedLeads); err != nil {
        log.Printf("Error creating patient relationships: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Patient created but failed to add relationships"})
    }
    
    // Fetch the complete patient with all relationships
    createdPatient, err := models.GetPatientByID(newPatient.ID)
    if err != nil {
        log.Printf("Error fetching created patient: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Patient created but failed to fetch complete data"})
    }
    
    return c.Status(http.StatusCreated).JSON(fiber.Map{"patient": createdPatient})
}

// UpdatePatient updates an existing patient
func UpdatePatient(c *fiber.Ctx) error {
    patientID := c.Params("id")
    
    id, err := strconv.ParseUint(patientID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patient ID format"})
    }
    
    var updateData models.Patient
    if err := c.BodyParser(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }
    
    // Get existing patient
    existingPatient, err := models.GetPatientByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Patient not found"})
        }
        log.Printf("Error fetching patient %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    // Validate input
    if err := validatePatientUpdate(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    
    // Update basic fields
    updatePatientFields(existingPatient, &updateData)
    
    if err := models.UpdatePatient(existingPatient); err != nil {
        log.Printf("Error updating patient %d: %v", id, err)
        if strings.Contains(err.Error(), "duplicate") {
            return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "MRN already exists"})
        }
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update patient"})
    }
    
    // Update relationships if provided
    if updateData.PatientDoctors != nil || updateData.ImplantedDevices != nil || updateData.ImplantedLeads != nil {
        if err := updatePatientRelationships(uint(id), updateData.PatientDoctors, updateData.ImplantedDevices, updateData.ImplantedLeads); err != nil {
            log.Printf("Error updating patient relationships: %v", err)
            return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Patient updated but failed to update relationships"})
        }
    }
    
    // Fetch updated patient
    updatedPatient, err := models.GetPatientByID(uint(id))
    if err != nil {
        log.Printf("Error fetching updated patient %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    return c.JSON(updatedPatient)
}

// DeletePatient removes a patient
func DeletePatient(c *fiber.Ctx) error {
    patientID := c.Params("id")
    
    id, err := strconv.ParseUint(patientID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patient ID format"})
    }
    
    // Check if patient exists
    _, err = models.GetPatientByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Patient not found"})
        }
        log.Printf("Error fetching patient %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    // Check if patient has reports
    hasReports, err := models.PatientHasReports(uint(id))
    if err != nil {
        log.Printf("Error checking reports for patient %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    if hasReports {
        return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Cannot delete patient that has associated reports"})
    }
    
    if err := models.DeletePatient(uint(id)); err != nil {
        log.Printf("Error deleting patient %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete patient"})
    }
    
    return c.SendStatus(http.StatusNoContent)
}

// Helper functions
func validatePatient(patient *models.Patient) error {
    if patient.MRN <= 0 {
        return errors.New("valid MRN is required")
    }
    if strings.TrimSpace(patient.FirstName) == "" {
        return errors.New("first name is required")
    }
    if strings.TrimSpace(patient.LastName) == "" {
        return errors.New("last name is required")
    }
    if patient.Email != "" && !utils.IsValidEmail(patient.Email) {
        return errors.New("invalid email format")
    }
    return nil
}

func validatePatientUpdate(patient *models.Patient) error {
    if patient.Email != "" && !utils.IsValidEmail(patient.Email) {
        return errors.New("invalid email format")
    }
    return nil
}

func sanitizePatient(patient *models.Patient) {
    patient.FirstName = html.EscapeString(strings.TrimSpace(patient.FirstName))
    patient.LastName = html.EscapeString(strings.TrimSpace(patient.LastName))
    patient.Email = html.EscapeString(strings.TrimSpace(patient.Email))
    patient.Phone = html.EscapeString(strings.TrimSpace(patient.Phone))
    patient.Street = html.EscapeString(strings.TrimSpace(patient.Street))
    patient.City = html.EscapeString(strings.TrimSpace(patient.City))
    patient.State = html.EscapeString(strings.TrimSpace(patient.State))
    patient.Country = html.EscapeString(strings.TrimSpace(patient.Country))
    patient.Postal = html.EscapeString(strings.TrimSpace(patient.Postal))
}

func updatePatientFields(existing *models.Patient, update *models.Patient) {
    if update.MRN != 0 {
        existing.MRN = update.MRN
    }
    if update.FirstName != "" {
        existing.FirstName = html.EscapeString(strings.TrimSpace(update.FirstName))
    }
    if update.LastName != "" {
        existing.LastName = html.EscapeString(strings.TrimSpace(update.LastName))
    }
    if update.DOB != "" {
        existing.DOB = update.DOB
    }
    if update.Gender != "" {
        existing.Gender = update.Gender
    }
    if update.Email != "" {
        existing.Email = html.EscapeString(strings.TrimSpace(update.Email))
    }
    if update.Phone != "" {
        existing.Phone = html.EscapeString(strings.TrimSpace(update.Phone))
    }
    if update.Street != "" {
        existing.Street = html.EscapeString(strings.TrimSpace(update.Street))
    }
    if update.City != "" {
        existing.City = html.EscapeString(strings.TrimSpace(update.City))
    }
    if update.State != "" {
        existing.State = html.EscapeString(strings.TrimSpace(update.State))
    }
    if update.Country != "" {
        existing.Country = html.EscapeString(strings.TrimSpace(update.Country))
    }
    if update.Postal != "" {
        existing.Postal = html.EscapeString(strings.TrimSpace(update.Postal))
    }
}

func createPatientRelationships(patientID uint, patientDoctors []models.PatientDoctor, devices []models.ImplantedDevice, leads []models.ImplantedLead) error {
    // Create patient-doctor relationships
    for _, pd := range patientDoctors {
        pd.PatientID = patientID
        if err := config.DB.Create(&pd).Error; err != nil {
            return err
        }
    }
    
    // Create implanted devices
    for _, device := range devices {
        device.PatientID = patientID
        if device.ImplantedAt.IsZero() {
            device.ImplantedAt = time.Now()
        }
        if err := config.DB.Create(&device).Error; err != nil {
            return err
        }
    }
    
    // Create implanted leads
    for _, lead := range leads {
        lead.PatientID = patientID
        if lead.ImplantedAt.IsZero() {
            lead.ImplantedAt = time.Now()
        }
        if err := config.DB.Create(&lead).Error; err != nil {
            return err
        }
    }
    
    return nil
}

func updatePatientRelationships(patientID uint, patientDoctors []models.PatientDoctor, devices []models.ImplantedDevice, leads []models.ImplantedLead) error {
    // Update patient-doctor relationships (replace all)
    if patientDoctors != nil {
        // Delete existing relationships
        if err := config.DB.Where("patient_id = ?", patientID).Delete(&models.PatientDoctor{}).Error; err != nil {
            return err
        }
        
        // Create new relationships
        for _, pd := range patientDoctors {
            pd.PatientID = patientID
            if err := config.DB.Create(&pd).Error; err != nil {
                return err
            }
        }
    }
    
    // Similar logic for devices and leads if needed
    return nil
}