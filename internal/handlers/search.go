package handlers

import (
    "log"
    "net/http"

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

    // Pass the search parameters to the model function.
    patients, err := models.SearchPatientsComplex(params)
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