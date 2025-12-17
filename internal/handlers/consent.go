package handlers

import (
    "net/http"
    "strconv"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/models"
    "github.com/rogerhendricks/goReporter/internal/security"
)

// GetPatientConsents retrieves all consents for a patient
func GetPatientConsents(c *fiber.Ctx) error {
    patientID, err := strconv.ParseUint(c.Params("patientId"), 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid patient ID",
        })
    }

    consents, err := models.GetPatientConsents(uint(patientID))
    if err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch consents",
        })
    }

    // Log access
    security.LogEventFromContext(c, security.EventDataAccess,
        "Patient consents accessed",
        "INFO",
        map[string]interface{}{
            "patientId": patientID,
        })

    return c.JSON(consents)
}

// GetActiveConsents retrieves all active consents for a patient
func GetActiveConsents(c *fiber.Ctx) error {
    patientID, err := strconv.ParseUint(c.Params("patientId"), 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid patient ID",
        })
    }

    consents, err := models.GetActiveConsents(uint(patientID))
    if err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch active consents",
        })
    }

    return c.JSON(consents)
}

// CreateConsent creates a new consent record
func CreateConsent(c *fiber.Ctx) error {
    var consent models.PatientConsent
    if err := c.BodyParser(&consent); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    // Get user ID from context
    userID := c.Locals("userID").(string)
    consent.GrantedBy = userID

    // Capture IP and User Agent for electronic consent
    consent.IPAddress = security.GetRealIP(c)
    consent.UserAgent = c.Get("User-Agent")

    if err := models.CreateConsent(&consent); err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to create consent",
        })
    }

    // Log event
    security.LogEventFromContext(c, security.EventDataModification,
        "Patient consent created",
        "INFO",
        map[string]interface{}{
            "patientId":   consent.PatientID,
            "consentType": consent.ConsentType,
        })

    return c.Status(http.StatusCreated).JSON(consent)
}

// UpdateConsent updates an existing consent
func UpdateConsent(c *fiber.Ctx) error {
    consentID, err := strconv.ParseUint(c.Params("id"), 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid consent ID",
        })
    }

    var consent models.PatientConsent
    if err := c.BodyParser(&consent); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    consent.ID = uint(consentID)
    if err := models.UpdateConsent(&consent); err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to update consent",
        })
    }

    // Log event
    security.LogEventFromContext(c, security.EventDataModification,
        "Patient consent updated",
        "INFO",
        map[string]interface{}{
            "consentId":   consentID,
            "patientId":   consent.PatientID,
            "consentType": consent.ConsentType,
        })

    return c.JSON(consent)
}

// RevokeConsent revokes a consent
func RevokeConsent(c *fiber.Ctx) error {
    consentID, err := strconv.ParseUint(c.Params("id"), 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid consent ID",
        })
    }

    var body struct {
        Notes string `json:"notes"`
    }
    if err := c.BodyParser(&body); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    userID := c.Locals("userID").(string)

    if err := models.RevokeConsent(uint(consentID), userID, body.Notes); err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to revoke consent",
        })
    }

    // Log event
    security.LogEventFromContext(c, security.EventDataModification,
        "Patient consent revoked",
        "WARNING",
        map[string]interface{}{
            "consentId": consentID,
        })

    return c.JSON(fiber.Map{
        "message": "Consent revoked successfully",
    })
}

// CheckConsentStatus checks if patient has active consent for specific type
func CheckConsentStatus(c *fiber.Ctx) error {
    patientID, err := strconv.ParseUint(c.Params("patientId"), 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid patient ID",
        })
    }

    consentType := models.ConsentType(c.Query("type"))
    if consentType == "" {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Consent type is required",
        })
    }

    hasConsent, err := models.HasActiveConsent(uint(patientID), consentType)
    if err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to check consent status",
        })
    }

    return c.JSON(fiber.Map{
        "patientId":   patientID,
        "consentType": consentType,
        "hasConsent":  hasConsent,
    })
}

// GetConsentStats retrieves consent statistics (admin only)
func GetConsentStats(c *fiber.Ctx) error {
    stats, err := models.GetConsentStats()
    if err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch consent statistics",
        })
    }

    return c.JSON(stats)
}

// GetConsentsByDateRange retrieves consents within a date range (admin only)
func GetConsentsByDateRange(c *fiber.Ctx) error {
    startDateStr := c.Query("startDate")
    endDateStr := c.Query("endDate")

    if startDateStr == "" || endDateStr == "" {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Start date and end date are required",
        })
    }

    startDate, err := time.Parse("2006-01-02", startDateStr)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid start date format (use YYYY-MM-DD)",
        })
    }

    endDate, err := time.Parse("2006-01-02", endDateStr)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid end date format (use YYYY-MM-DD)",
        })
    }

    consents, err := models.GetConsentsByDateRange(startDate, endDate)
    if err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch consents",
        })
    }

    return c.JSON(consents)
}

// DeleteConsent deletes a consent record (soft delete)
func DeleteConsent(c *fiber.Ctx) error {
    consentID, err := strconv.ParseUint(c.Params("id"), 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid consent ID",
        })
    }

    if err := models.DeleteConsent(uint(consentID)); err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to delete consent",
        })
    }

    // Log event
    security.LogEventFromContext(c, security.EventDataDeletion,
        "Patient consent deleted",
        "WARNING",
        map[string]interface{}{
            "consentId": consentID,
        })

    return c.JSON(fiber.Map{
        "message": "Consent deleted successfully",
    })
}