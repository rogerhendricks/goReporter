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

    // Validate terms acceptance
    if !consent.TermsAccepted {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Terms and conditions must be accepted",
        })
    }

    // Get user ID from context
    userID := c.Locals("userID").(string)
    consent.GrantedBy = userID

    // Capture IP and User Agent for electronic consent
    consent.IPAddress = security.GetRealIP(c)
    consent.UserAgent = c.Get("User-Agent")

    // Set terms acceptance timestamp
    now := time.Now()
    consent.TermsAcceptedAt = &now

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

    var updateData struct {
        ConsentType      *models.ConsentType `json:"consentType,omitempty"`
        ExpiryDate       *string             `json:"expiryDate,omitempty"`
        Notes            *string             `json:"notes,omitempty"`
        TermsAccepted    *bool               `json:"termsAccepted,omitempty"`
        TermsVersion     *string             `json:"termsVersion,omitempty"`
        ReacceptRequired bool                `json:"reacceptRequired,omitempty"` // Flag to indicate terms re-acceptance
    }

    if err := c.BodyParser(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    // Get existing consent
    existingConsent, err := models.GetConsentByID(uint(consentID))
    if err != nil {
        return c.Status(http.StatusNotFound).JSON(fiber.Map{
            "error": "Consent not found",
        })
    }

    // Track if terms were re-accepted
    termsReaccepted := false

    // If terms acceptance is being updated, validate it
    if updateData.TermsAccepted != nil && *updateData.TermsAccepted {
        if updateData.TermsVersion == nil || *updateData.TermsVersion == "" {
            return c.Status(http.StatusBadRequest).JSON(fiber.Map{
                "error": "Terms version is required when accepting terms",
            })
        }

        // Update terms acceptance
        now := time.Now()
        existingConsent.TermsAccepted = true
        existingConsent.TermsAcceptedAt = &now
        existingConsent.TermsVersion = *updateData.TermsVersion
        existingConsent.IPAddress = security.GetRealIP(c)
        existingConsent.UserAgent = c.Get("User-Agent")
        termsReaccepted = true
    }

    // Update other fields if provided
    if updateData.ConsentType != nil {
        existingConsent.ConsentType = *updateData.ConsentType
    }

    if updateData.ExpiryDate != nil {
        if *updateData.ExpiryDate == "" {
            existingConsent.ExpiryDate = nil
        } else {
            expiryDate, err := time.Parse("2006-01-02", *updateData.ExpiryDate)
            if err != nil {
                return c.Status(http.StatusBadRequest).JSON(fiber.Map{
                    "error": "Invalid expiry date format (use YYYY-MM-DD)",
                })
            }
            existingConsent.ExpiryDate = &expiryDate
        }
    }

    if updateData.Notes != nil {
        existingConsent.Notes = *updateData.Notes
    }

    if err := models.UpdateConsent(existingConsent); err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to update consent",
        })
    }

    // Log event with appropriate message
    logMessage := "Patient consent updated"
    if termsReaccepted {
        logMessage = "Patient consent updated with terms re-acceptance"
    }

    security.LogEventFromContext(c, security.EventDataModification,
        logMessage,
        "INFO",
        map[string]interface{}{
            "consentId":       consentID,
            "patientId":       existingConsent.PatientID,
            "consentType":     existingConsent.ConsentType,
            "termsReaccepted": termsReaccepted,
            "termsVersion":    existingConsent.TermsVersion,
        })

    return c.JSON(existingConsent)
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

// ReacceptTerms allows re-acceptance of terms for an existing consent
func ReacceptTerms(c *fiber.Ctx) error {
    consentID, err := strconv.ParseUint(c.Params("id"), 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid consent ID",
        })
    }

    var body struct {
        TermsAccepted bool   `json:"termsAccepted"`
        TermsVersion  string `json:"termsVersion"`
    }

    if err := c.BodyParser(&body); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    if !body.TermsAccepted {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Terms must be accepted",
        })
    }

    if body.TermsVersion == "" {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{
            "error": "Terms version is required",
        })
    }

    // Get existing consent
    consent, err := models.GetConsentByID(uint(consentID))
    if err != nil {
        return c.Status(http.StatusNotFound).JSON(fiber.Map{
            "error": "Consent not found",
        })
    }

    // Update terms acceptance
    now := time.Now()
    consent.TermsAccepted = true
    consent.TermsAcceptedAt = &now
    consent.TermsVersion = body.TermsVersion
    consent.IPAddress = security.GetRealIP(c)
    consent.UserAgent = c.Get("User-Agent")

    if err := models.UpdateConsent(consent); err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to update consent",
        })
    }

    // Log event
    security.LogEventFromContext(c, security.EventDataModification,
        "Patient consent terms re-accepted",
        "INFO",
        map[string]interface{}{
            "consentId":    consentID,
            "patientId":    consent.PatientID,
            "consentType":  consent.ConsentType,
            "termsVersion": body.TermsVersion,
        })

    return c.JSON(consent)
}