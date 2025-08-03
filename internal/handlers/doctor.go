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

// --- DTOs for API Responses ---

type AddressResponse struct {
    ID      uint   `json:"id"`
    Street  string `json:"street"`
    City    string `json:"city"`
    State   string `json:"state"`
    Country string `json:"country"`
    Zip     string `json:"zip"`
}

type DoctorResponse struct {
    ID        uint              `json:"id"`
    Name      string            `json:"name"`
    Email     string            `json:"email"`
    Phone     string            `json:"phone"`
    Specialty string            `json:"specialty"`
    Addresses []AddressResponse `json:"addresses"`
}

// --- Mappers ---

func toAddressResponse(address models.Address) AddressResponse {
    return AddressResponse{
        ID:      address.ID,
        Street:  address.Street,
        City:    address.City,
        State:   address.State,
        Country: address.Country,
        Zip:     address.Zip,
    }
}

func toDoctorResponse(doctor models.Doctor) DoctorResponse {
    var addresses []AddressResponse
    for _, addr := range doctor.Addresses {
        addresses = append(addresses, toAddressResponse(addr))
    }
    return DoctorResponse{
        ID:        doctor.ID,
        Name:      doctor.Name,
        Email:     doctor.Email,
        Phone:     doctor.Phone,
        Specialty: doctor.Specialty,
        Addresses: addresses,
    }
}

// GetDoctors retrieves all doctors
func GetDoctors(c *fiber.Ctx) error {
    // Check if user has appropriate permissions
    // userID := c.Locals("userID").(string)

    // _, err := models.GetUserByID(userID)
    // if err != nil {
    //     return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
    // }

    doctors, err := models.GetAllDoctors()
    if err != nil {
        log.Printf("Error fetching doctors: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch doctors"})
    }

    // Map models.Doctor to DoctorResponse
    var doctorResponses []DoctorResponse
    for _, d := range doctors {
        doctorResponses = append(doctorResponses, toDoctorResponse(d))
    }

    return c.JSON(doctorResponses)
}

func GetDoctorsBasic(c *fiber.Ctx) error {

    // Check if user is authenticated (no admin requirement)
    userID := c.Locals("userID").(string)
    
    _, err := models.GetUserByID(userID)
    if err != nil {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
    }

    doctors, err := models.GetAllDoctors()
    if err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch devices"})
    }

    // Ensure we return an empty array if no devices
    if doctors == nil {
        return c.JSON([]interface{}{})
    }

    if len(doctors) == 0 {
        return c.JSON([]interface{}{})
    }

    // Create a simplified response with consistent field names
    type DoctorBasic struct {
        ID        uint   `json:"id"`
        Name      string `json:"name"`
        Email     string `json:"email"`
        Phone     string `json:"phone"`
        Specialty string `json:"specialty"`
    }

    var basicDoctors []DoctorBasic
    for _, doctor := range doctors {
        basicDoctors = append(basicDoctors, DoctorBasic{
            ID:        doctor.ID,
            Name:      doctor.Name,
            Email:     doctor.Email,
            Phone:     doctor.Phone,
            Specialty: doctor.Specialty,
        })
    }

    log.Printf("Returning %d basic doctors", len(basicDoctors)) // Add this debug line
    return c.JSON(basicDoctors)
}

// GetDoctor retrieves a specific doctor by ID
func GetDoctor(c *fiber.Ctx) error {
    doctorID, err := strconv.ParseUint(c.Params("id"), 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid doctor ID format"})
    }

    doctor, err := models.GetDoctorByID(uint(doctorID))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Doctor not found"})
        }
        log.Printf("Error fetching doctor %d: %v", doctorID, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    return c.JSON(toDoctorResponse(*doctor))
}
// func GetDoctor(c *fiber.Ctx) error {
//     doctorID := c.Params("id")
    
//     // Validate ID format
//     id, err := strconv.ParseUint(doctorID, 10, 32)
//     if err != nil {
//         return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid doctor ID format"})
//     }

//     doctor, err := models.GetDoctorByID(uint(id))
//     if err != nil {
//         if errors.Is(err, gorm.ErrRecordNotFound) {
//             return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Doctor not found"})
//         }
//         log.Printf("Error fetching doctor %d: %v", id, err)
//         return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
//     }

//     return c.JSON(doctor)
// }

// SearchDoctors retrieves doctors matching the search query
func SearchDoctors(c *fiber.Ctx) error {
    
    // Check if user has appropriate permissions
    userID := c.Locals("userID").(string)
    _, err := models.GetUserByID(userID)
    if err != nil {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
    }
    
    searchQuery := c.Query("search")
    searchQuery = html.EscapeString(strings.TrimSpace(searchQuery))
    doctors, err := models.GetAllDoctorsBySearch(searchQuery)
    if err != nil {
        log.Printf("Error searching doctors: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to search doctors"})
    }

    if doctors == nil {
        return c.JSON([]models.Doctor{}) // Return empty slice if no doctors found
    }

    if len(doctors) == 0 {
        return c.JSON([]models.Doctor{}) // Return empty slice if no doctors found
    }

    type DoctorResponse struct {
        ID        uint      `json:"id"`
        Name      string    `json:"name"`
        Email     string    `json:"email"`
        Phone     string    `json:"phone"`
        Specialty string    `json:"specialty"`
        Addresses []models.Address `json:"addresses"`
    }

    var doctorResponses []DoctorResponse
    for _, doctor := range doctors {
        doctorResponses = append(doctorResponses , DoctorResponse{
            ID:        doctor.ID,
            Name:      doctor.Name,
            Email:     doctor.Email,
            Phone:     doctor.Phone,
            Specialty: doctor.Specialty,
            Addresses: doctor.Addresses,
        })
    }
    return c.JSON(doctorResponses)

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
            return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Doctor with this email already exists"})
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
            return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Email already exists"})
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
    if strings.TrimSpace(doctor.Name) == "" {
        return errors.New("name is required")
    }
    if doctor.Email != "" && !utils.IsValidEmail(doctor.Email) {
        return errors.New("invalid email format")
    }
    if doctor.Phone != "" && !isValidPhone(doctor.Phone) {
        return errors.New("invalid phone number format")
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
        if strings.TrimSpace(addr.Country) == "" {
            return errors.New("country is required for address " + strconv.Itoa(i+1))
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
    doctor.Name = html.EscapeString(strings.TrimSpace(doctor.Name))
    doctor.Email = html.EscapeString(strings.TrimSpace(doctor.Email))
    doctor.Phone = html.EscapeString(strings.TrimSpace(doctor.Phone))
    doctor.Specialty = html.EscapeString(strings.TrimSpace(doctor.Specialty))
}

func sanitizeAddresses(addresses []models.Address) {
    for i := range addresses {
        addresses[i].Street = html.EscapeString(strings.TrimSpace(addresses[i].Street))
        addresses[i].City = html.EscapeString(strings.TrimSpace(addresses[i].City))
        addresses[i].State = html.EscapeString(strings.TrimSpace(addresses[i].State))
        addresses[i].Country = html.EscapeString(strings.TrimSpace(addresses[i].Country))
        addresses[i].Zip = html.EscapeString(strings.TrimSpace(addresses[i].Zip))
    }
}

func updateDoctorFields(existing *models.Doctor, update *models.Doctor) {
    if update.Name != "" {
        existing.Name = html.EscapeString(strings.TrimSpace(update.Name))
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
}

// Helper validation functions
func isValidPhone(phone string) bool {
    phoneRegex := regexp.MustCompile(`^\+?[\d\s\-\(\)]{8,20}$`)
    return phoneRegex.MatchString(phone)
}

func isValidZip(zip string) bool {
    // zipRegex := regexp.MustCompile(`^\d{5}(-\d{4})?$`)
    zipRegex := regexp.MustCompile(`^\d{1,7}$`)
    return zipRegex.MatchString(zip)
}