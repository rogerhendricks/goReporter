package handlers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/models"
    "net/http"
    "log"
    "strings"
    "html"
    "errors"
    "gorm.io/gorm"
    "strconv"
)

// --- DTO for API Responses ---
type LeadResponse struct {
    ID           uint   `json:"id"`
    Name         string `json:"name"`
    Manufacturer string `json:"manufacturer"`
    Model        string `json:"model"`
    Type         string `json:"type"`
    IsMri        bool   `json:"isMri"`
}


// GetLeads retrieves all leads
func GetLeads(c *fiber.Ctx) error {
    // Check if user has admin role for full access
    userID := c.Locals("userID").(string)
    _, err := models.GetUserByID(userID)
    if err != nil {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
    }

    leads, err := models.GetAllLeads()
    if err != nil {
        log.Printf("Error fetching leads: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch leads"})
    }

    return c.JSON(leads)
}

// GetleadsBasic retrieves basic device information (name, manufacturer, type, model)
func GetleadsBasic(c *fiber.Ctx) error {

    // Check if user is authenticated (no admin requirement)
    userID := c.Locals("userID").(string)

    _, err := models.GetUserByID(userID)
    if err != nil {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
    }

    leads, err := models.GetAllLeads()
    if err != nil {
        log.Printf("Error fetching leads: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch leads"})
    }

    // Ensure we return an empty array if no devices
    if leads == nil {
        return c.JSON([]interface{}{})
    }

    if len(leads) == 0 {
        return c.JSON([]interface{}{})
    }

    // Return only basic information
    type LeadBasic struct {
        ID           uint   `json:"id"`
        Name         string `json:"name"`
        Manufacturer string `json:"manufacturer"`
        LeadModel    string `json:"leadModel"`
        IsMri        bool   `json:"isMri"`
        Type         string `json:"type"`
    }
    var basicLeads []LeadBasic
    for _, lead := range leads {
        basicLeads = append(basicLeads, LeadBasic{
            ID:           lead.ID,
            Name:         lead.Name,
            Manufacturer: lead.Manufacturer,
            LeadModel:    lead.LeadModel,
            IsMri:        lead.IsMri,
            Type:         lead.Type,
        })
    }
    return c.JSON(basicLeads)
}

func SearchLeads(c *fiber.Ctx) error {
    userID := c.Locals("userID").(string)
    
    _, err := models.GetUserByID(userID)
    if err != nil {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
    }   

    searchQuery := c.Query("search")
    searchQuery = html.EscapeString(strings.TrimSpace(searchQuery))

    leads, err := models.GetAllLeadsBySearch(searchQuery)
    if err != nil {
        log.Printf("Error fetching leads: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch leads"})
    }
    
    if leads == nil{
        log.Printf("No leads found")
        return c.JSON([]interface{}{})
    }

    if len(leads) == 0 {
        return c.JSON([]interface{}{})
    }

    // Return only basic information
    type LeadBasic struct {
        ID           uint   `json:"id"`
        Name         string `json:"name"`
        Manufacturer string `json:"manufacturer"`
        LeadModel    string `json:"leadModel"`
        IsMri        bool   `json:"isMri"`
        Type         string `json:"type"`
    }

    var basicLeads []LeadBasic
    for _, lead := range leads {
        basicLeads = append(basicLeads, LeadBasic{
            ID:           lead.ID,
            Name:         lead.Name,
            Manufacturer: lead.Manufacturer,
            LeadModel:    lead.LeadModel,
            IsMri:        lead.IsMri,
            Type:         lead.Type,
        })
    }
    return c.JSON(basicLeads)
}

// GetLead retrieves a specific lead by ID
func GetLead(c *fiber.Ctx) error {
    leadID := c.Params("id")
    
    // Validate ID format
    id, err := strconv.ParseUint(leadID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid lead ID format"})
    }

    lead, err := models.GetLeadByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Lead not found"})
        }
        log.Printf("Error fetching lead %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    return c.JSON(lead)
}

// CreateLead creates a new lead
func CreateLead(c *fiber.Ctx) error {
    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }

    var newLead models.Lead
    if err := c.BodyParser(&newLead); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }

    // Validate input
    if err := validateLead(&newLead); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // Sanitize input
    newLead.Name = html.EscapeString(strings.TrimSpace(newLead.Name))
    newLead.Manufacturer = html.EscapeString(strings.TrimSpace(newLead.Manufacturer))
    newLead.LeadModel = html.EscapeString(strings.TrimSpace(newLead.LeadModel))
    newLead.Type = html.EscapeString(strings.TrimSpace(newLead.Type))

    // Create lead in database
    if err := models.CreateLead(&newLead); err != nil {
        log.Printf("Error creating lead: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create lead"})
    }

    return c.Status(http.StatusCreated).JSON(newLead)
}

// UpdateLead updates an existing lead
func UpdateLead(c *fiber.Ctx) error {
    leadID := c.Params("id")
    
    // Validate ID format
    id, err := strconv.ParseUint(leadID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid lead ID format"})
    }

    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }

    var updateData models.Lead
    if err := c.BodyParser(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }

    // Get existing lead
    existingLead, err := models.GetLeadByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Lead not found"})
        }
        log.Printf("Error fetching lead %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    // Validate input
    if err := validateLeadUpdate(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // Update fields if provided
    if updateData.Name != "" {
        existingLead.Name = html.EscapeString(strings.TrimSpace(updateData.Name))
    }
    if updateData.Manufacturer != "" {
        existingLead.Manufacturer = html.EscapeString(strings.TrimSpace(updateData.Manufacturer))
    }
    if updateData.LeadModel != "" {
        existingLead.LeadModel = html.EscapeString(strings.TrimSpace(updateData.LeadModel))
    }
    if updateData.Type != "" {
        existingLead.Type = html.EscapeString(strings.TrimSpace(updateData.Type))
    }
    // Update boolean field
    existingLead.IsMri = updateData.IsMri

    if err := models.UpdateLead(existingLead); err != nil {
        log.Printf("Error updating lead %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update lead"})
    }

    return c.JSON(existingLead)
}

// DeleteLead removes a lead
func DeleteLead(c *fiber.Ctx) error {
    leadID := c.Params("id")
    
    // Validate ID format
    id, err := strconv.ParseUint(leadID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid lead ID format"})
    }

    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }

    // Check if lead exists
    _, err = models.GetLeadByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Lead not found"})
        }
        log.Printf("Error fetching lead %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    // Check if lead is being used (has implanted leads)
    hasImplanted, err := models.LeadHasImplantedLeads(uint(id))
    if err != nil {
        log.Printf("Error checking implanted leads for lead %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    if hasImplanted {
        return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Cannot delete lead that has implanted instances"})
    }

    if err := models.DeleteLead(uint(id)); err != nil {
        log.Printf("Error deleting lead %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete lead"})
    }

    return c.SendStatus(http.StatusNoContent)
}

// validateLead validates lead creation input
func validateLead(lead *models.Lead) error {
    if strings.TrimSpace(lead.Name) == "" {
        return errors.New("lead name is required")
    }
    
    if len(strings.TrimSpace(lead.Name)) > 255 {
        return errors.New("lead name must be less than 255 characters")
    }
    
    if lead.Manufacturer != "" && len(strings.TrimSpace(lead.Manufacturer)) > 255 {
        return errors.New("manufacturer must be less than 255 characters")
    }
    
    if lead.LeadModel != "" && len(strings.TrimSpace(lead.LeadModel)) > 50 {
        return errors.New("lead model must be less than 50 characters")
    }
    
    if lead.Type != "" && len(strings.TrimSpace(lead.Type)) > 50 {
        return errors.New("lead type must be less than 50 characters")
    }
    
    return nil
}

// validateLeadUpdate validates lead update input
func validateLeadUpdate(lead *models.Lead) error {
    if lead.Name != "" {
        if len(strings.TrimSpace(lead.Name)) > 255 {
            return errors.New("lead name must be less than 255 characters")
        }
    }
    
    if lead.Manufacturer != "" && len(strings.TrimSpace(lead.Manufacturer)) > 255 {
        return errors.New("manufacturer must be less than 255 characters")
    }
    
    if lead.LeadModel != "" && len(strings.TrimSpace(lead.LeadModel)) > 50 {
        return errors.New("lead model must be less than 50 characters")
    }
    
    if lead.Type != "" && len(strings.TrimSpace(lead.Type)) > 50 {
        return errors.New("lead type must be less than 50 characters")
    }
    
    return nil
}