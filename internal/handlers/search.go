package handlers

import (
    "log"
    "net/http"
    "strconv"
    "strings"

    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/models"
)

// SearchPatientsComplex handles advanced patient searches with multiple filters.
func SearchPatientsComplex(c *fiber.Ctx) error {
    // Collect all query parameters from the request.
    // Fiber's QueryParser can map query params to a struct.
    var params models.PatientSearchParams
    if err := c.QueryParser(&params); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid search parameters"})
    }

    userID := c.Locals("userID").(string)
    userRole := c.Locals("userRole").(string)

    var patients []models.Patient
    var err error

    // Admin users can search all patients with complex parameters
    if userRole == "admin" {
        patients, err = models.SearchPatientsComplex(params)
    } else if userRole == "doctor" {
        // For doctors, we need to get their patients first, then filter
        // This is a simplified approach - in a real app you might want to extend the SearchPatientsComplex
        // function to accept a doctor filter
        allPatients, err := models.GetPatientsForDoctor(userID)
        if err != nil {
            log.Printf("Error fetching patients for doctor %s: %v", userID, err)
            return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
        }

        // Apply basic filtering on doctor's patients
        // For a full implementation, you'd need to extend this to handle all search parameters
        var filteredPatients []models.Patient
        for _, p := range allPatients {
            include := true
            if params.FirstName != "" && !strings.Contains(strings.ToLower(p.FirstName), strings.ToLower(params.FirstName)) {
                include = false
            }
            if params.LastName != "" && !strings.Contains(strings.ToLower(p.LastName), strings.ToLower(params.LastName)) {
                include = false
            }
            if params.MRN != "" && strconv.Itoa(p.MRN) != params.MRN {
                include = false
            }
            if include {
                filteredPatients = append(filteredPatients, p)
            }
        }
        patients = filteredPatients
    } else {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
    }

    if err != nil {
        log.Printf("Error during complex patient search: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to execute search"})
    }

    // If no patients are found, return an empty array.
    if patients == nil {
        return c.JSON([]PatientResponse{})
    }

    // Convert the results to the standard PatientResponse DTO.
    var patientResponses []PatientResponse
    for _, p := range patients {
        patientResponses = append(patientResponses, toPatientResponse(p))
    }

    return c.JSON(patientResponses)
}