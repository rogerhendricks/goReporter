package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/models"
)

type PatientSearchResponse struct {
	ID             uint                    `json:"id"`
	MRN            int                     `json:"mrn"`
	Fname          string                  `json:"fname"`
	Lname          string                  `json:"lname"`
	Dob            string                  `json:"dob"`
	Phone          string                  `json:"phone"`
	Email          string                  `json:"email"`
	Street         string                  `json:"street"`
	City           string                  `json:"city"`
	State          string                  `json:"state"`
	Country        string                  `json:"country"`
	Postal         string                  `json:"postal"`
	PatientDoctors []PatientDoctorResponse `json:"patientDoctors"`
	ReportCount    int                     `json:"reportCount"`
	CreatedAt      time.Time               `json:"createdAt"`
	UpdatedAt      time.Time               `json:"updatedAt"`
	Tags           []models.Tag            `json:"tags"`
}

func toPatientSearchResponse(patient models.Patient) PatientSearchResponse {
	resp := PatientSearchResponse{
		ID:          patient.ID,
		MRN:         patient.MRN,
		Fname:       patient.FirstName,
		Lname:       patient.LastName,
		Dob:         patient.DOB,
		Phone:       patient.Phone,
		Email:       patient.Email,
		Street:      patient.Street,
		City:        patient.City,
		State:       patient.State,
		Country:     patient.Country,
		Postal:      patient.Postal,
		ReportCount: len(patient.Reports),
		CreatedAt:   patient.CreatedAt,
		UpdatedAt:   patient.UpdatedAt,
	}

	for _, pd := range patient.PatientDoctors {
		resp.PatientDoctors = append(resp.PatientDoctors, PatientDoctorResponse{
			ID:        pd.ID,
			DoctorID:  pd.DoctorID,
			AddressID: pd.AddressID,
			IsPrimary: pd.IsPrimary,
			Doctor:    toDoctorResponse(pd.Doctor),
			Address:   pd.Address,
		})
	}

	if len(patient.Tags) > 0 {
		resp.Tags = patient.Tags
	} else {
		resp.Tags = []models.Tag{}
	}

	return resp
}

// // SearchPatientsComplex handles advanced patient searches with multiple filters.
// func SearchPatientsComplex(c *fiber.Ctx) error {
// 	// Collect all query parameters from the request.
// 	// Fiber's QueryParser can map query params to a struct.
// 	var params models.PatientSearchParams
// 	if err := c.QueryParser(&params); err != nil {
// 		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid search parameters"})
// 	}

// 	userID := c.Locals("userID").(string)
// 	userRole := c.Locals("userRole").(string)

// 	var patients []models.Patient
// 	var err error

// 	// Admin users can search all patients with complex parameters
// 	if userRole == "admin" {
// 		patients, err = models.SearchPatientsComplex(params)
// 	} else if userRole == "doctor" {
// 		// For doctors, we need to get their patients first, then filter
// 		// This is a simplified approach - in a real app you might want to extend the SearchPatientsComplex
// 		// function to accept a doctor filter
// 		allPatients, err := models.GetPatientsForDoctor(userID)
// 		if err != nil {
// 			log.Printf("Error fetching patients for doctor %s: %v", userID, err)
// 			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
// 		}

// 		// Apply basic filtering on doctor's patients
// 		// For a full implementation, you'd need to extend this to handle all search parameters
// 		var filteredPatients []models.Patient
// 		for _, p := range allPatients {
// 			include := true
// 			if params.FirstName != "" && !strings.Contains(strings.ToLower(p.FirstName), strings.ToLower(params.FirstName)) {
// 				include = false
// 			}
// 			if params.LastName != "" && !strings.Contains(strings.ToLower(p.LastName), strings.ToLower(params.LastName)) {
// 				include = false
// 			}
// 			if params.MRN != "" && strconv.Itoa(p.MRN) != params.MRN {
// 				include = false
// 			}
// 			if len(params.Tags) > 0 {
// 				hasTag := false
// 				for _, t := range p.Tags {
// 					for _, searchTagID := range params.Tags {
// 						if int(t.ID) == searchTagID {
// 							hasTag = true
// 							break
// 						}
// 					}
// 					if hasTag {
// 						break
// 					}
// 				}
// 				if !hasTag {
// 					include = false
// 				}
// 			}
// 			if include {
// 				filteredPatients = append(filteredPatients, p)
// 			}
// 		}
// 		patients = filteredPatients
// 	} else {
// 		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
// 	}

// 	if err != nil {
// 		log.Printf("Error during complex patient search: %v", err)
// 		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to execute search"})
// 	}

// 	// If no patients are found, return an empty array.
// 	if patients == nil {
// 		return c.JSON([]PatientResponse{})
// 	}

// 	// Convert the results to the standard PatientResponse DTO.
// 	var patientResponses []PatientResponse
// 	for _, p := range patients {
// 		patientResponses = append(patientResponses, toPatientResponse(p))
// 	}

// 	return c.JSON(patientResponses)
// }

func SearchPatientsComplex(c *fiber.Ctx) error {
	var params models.PatientSearchParams
	if err := c.QueryParser(&params); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid search parameters"})
	}

	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)

	// Set default fuzzy match to true if not specified
	if c.Query("fuzzyMatch") == "" {
		params.FuzzyMatch = true
	}

	var patients []models.Patient
	var err error

	switch userRole {
	case "admin", "user", "viewer", "staff_doctor":
		patients, err = models.SearchPatientsComplex(params)
	case "doctor":
		// For doctors, get their patients first
		allPatients, err := models.GetPatientsForDoctor(userID)
		if err != nil {
			log.Printf("Error fetching patients for doctor %s: %v", userID, err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
		}

		// Filter patients based on search parameters
		if params.FirstName == "" && params.LastName == "" && params.MRN == "" && len(params.Tags) == 0 &&
			params.DOB == "" && params.DoctorName == "" &&
			params.DeviceSerial == "" && params.DeviceManufacturer == "" && params.DeviceName == "" && params.DeviceModel == "" &&
			params.LeadManufacturer == "" && params.LeadName == "" {
			patients = allPatients
		} else {
			var filtered []models.Patient
			isOr := strings.ToUpper(params.BooleanOperator) == "OR"

			for _, p := range allPatients {
				matchCount := 0
				criteriaCount := 0

				if params.FirstName != "" {
					criteriaCount++
					if params.FuzzyMatch {
						if strings.Contains(strings.ToLower(p.FirstName), strings.ToLower(params.FirstName)) {
							matchCount++
						}
					} else {
						if strings.EqualFold(p.FirstName, params.FirstName) {
							matchCount++
						}
					}
				}

				if params.LastName != "" {
					criteriaCount++
					if params.FuzzyMatch {
						if strings.Contains(strings.ToLower(p.LastName), strings.ToLower(params.LastName)) {
							matchCount++
						}
					} else {
						if strings.EqualFold(p.LastName, params.LastName) {
							matchCount++
						}
					}
				}

				if params.MRN != "" {
					criteriaCount++
					mrnStr := strconv.Itoa(p.MRN)
					if params.FuzzyMatch {
						if strings.Contains(mrnStr, params.MRN) {
							matchCount++
						}
					} else {
						if mrnStr == params.MRN {
							matchCount++
						}
					}
				}

				if params.DOB != "" {
					criteriaCount++
					if params.FuzzyMatch {
						if strings.Contains(p.DOB, params.DOB) {
							matchCount++
						}
					} else {
						if p.DOB == params.DOB {
							matchCount++
						}
					}
				}

				if params.DoctorName != "" {
					criteriaCount++
					found := false
					for _, pd := range p.PatientDoctors {
						if params.FuzzyMatch {
							if strings.Contains(strings.ToLower(pd.Doctor.FullName), strings.ToLower(params.DoctorName)) {
								found = true
								break
							}
						} else {
							if strings.EqualFold(pd.Doctor.FullName, params.DoctorName) {
								found = true
								break
							}
						}
					}
					if found {
						matchCount++
					}
				}

				if params.DeviceSerial != "" {
					criteriaCount++
					found := false
					for _, d := range p.ImplantedDevices {
						if params.FuzzyMatch {
							if strings.Contains(strings.ToLower(d.Serial), strings.ToLower(params.DeviceSerial)) {
								found = true
								break
							}
						} else {
							if strings.EqualFold(d.Serial, params.DeviceSerial) {
								found = true
								break
							}
						}
					}
					if found {
						matchCount++
					}
				}

				if params.DeviceManufacturer != "" {
					criteriaCount++
					found := false
					for _, d := range p.ImplantedDevices {
						if params.FuzzyMatch {
							if strings.Contains(strings.ToLower(d.Device.Manufacturer), strings.ToLower(params.DeviceManufacturer)) {
								found = true
								break
							}
						} else {
							if strings.EqualFold(d.Device.Manufacturer, params.DeviceManufacturer) {
								found = true
								break
							}
						}
					}
					if found {
						matchCount++
					}
				}

				if params.DeviceName != "" {
					criteriaCount++
					found := false
					for _, d := range p.ImplantedDevices {
						if params.FuzzyMatch {
							if strings.Contains(strings.ToLower(d.Device.Name), strings.ToLower(params.DeviceName)) {
								found = true
								break
							}
						} else {
							if strings.EqualFold(d.Device.Name, params.DeviceName) {
								found = true
								break
							}
						}
					}
					if found {
						matchCount++
					}
				}

				if params.DeviceModel != "" {
					criteriaCount++
					found := false
					for _, d := range p.ImplantedDevices {
						// Assuming DevModel maps to dev_model column
						if params.FuzzyMatch {
							if strings.Contains(strings.ToLower(d.Device.DevModel), strings.ToLower(params.DeviceModel)) {
								found = true
								break
							}
						} else {
							if strings.EqualFold(d.Device.DevModel, params.DeviceModel) {
								found = true
								break
							}
						}
					}
					if found {
						matchCount++
					}
				}

				if params.LeadManufacturer != "" {
					criteriaCount++
					found := false
					for _, l := range p.ImplantedLeads {
						if params.FuzzyMatch {
							if strings.Contains(strings.ToLower(l.Lead.Manufacturer), strings.ToLower(params.LeadManufacturer)) {
								found = true
								break
							}
						} else {
							if strings.EqualFold(l.Lead.Manufacturer, params.LeadManufacturer) {
								found = true
								break
							}
						}
					}
					if found {
						matchCount++
					}
				}

				if params.LeadName != "" {
					criteriaCount++
					found := false
					for _, l := range p.ImplantedLeads {
						if params.FuzzyMatch {
							if strings.Contains(strings.ToLower(l.Lead.Name), strings.ToLower(params.LeadName)) {
								found = true
								break
							}
						} else {
							if strings.EqualFold(l.Lead.Name, params.LeadName) {
								found = true
								break
							}
						}
					}
					if found {
						matchCount++
					}
				}

				if len(params.Tags) > 0 {
					criteriaCount++
					tagMatch := false
					for _, t := range p.Tags {
						for _, searchTagID := range params.Tags {
							if int(t.ID) == searchTagID {
								tagMatch = true
								break
							}
						}
						if tagMatch {
							break
						}
					}
					if tagMatch {
						matchCount++
					}
				}

				include := false
				if isOr {
					include = matchCount > 0
				} else {
					include = matchCount == criteriaCount
				}

				if include {
					filtered = append(filtered, p)
				}
			}
			patients = filtered
		}
	default:
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
	}

	if err != nil {
		log.Printf("Error during complex patient search: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to execute search"})
	}

	// Record search history asynchronously
	go func() {
		filterMap := make(models.JSON)
		filterMap["firstName"] = params.FirstName
		filterMap["lastName"] = params.LastName
		filterMap["mrn"] = params.MRN
		filterMap["fuzzyMatch"] = params.FuzzyMatch
		filterMap["booleanOperator"] = params.BooleanOperator

		history := &models.SearchHistory{
			UserID:  userID,
			Query:   params.FirstName + " " + params.LastName,
			Filters: filterMap,
			Results: len(patients),
		}
		if err := models.AddSearchHistory(history); err != nil {
			log.Printf("Failed to save search history: %v", err)
		}
	}()

	if patients == nil {
		return c.JSON([]PatientSearchResponse{})
	}

	var patientResponses []PatientSearchResponse
	for _, p := range patients {
		patientResponses = append(patientResponses, toPatientSearchResponse(p))
	}

	return c.JSON(patientResponses)
}

// SaveSearchFilter saves a user's search configuration
func SaveSearchFilter(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var filter models.SavedSearchFilter
	if err := c.BodyParser(&filter); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	filter.UserID = userID

	if err := models.SaveSearchFilter(&filter); err != nil {
		log.Printf("Error saving search filter: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save filter"})
	}

	return c.Status(http.StatusCreated).JSON(filter)
}

// GetSavedSearchFilters retrieves all saved searches for a user
func GetSavedSearchFilters(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	filters, err := models.GetSavedSearchFilters(userID)
	if err != nil {
		log.Printf("Error fetching saved filters: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch filters"})
	}

	return c.JSON(filters)
}

// DeleteSavedSearchFilter removes a saved search
func DeleteSavedSearchFilter(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid filter ID"})
	}

	if err := models.DeleteSavedSearchFilter(uint(id), userID); err != nil {
		log.Printf("Error deleting filter: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete filter"})
	}

	return c.SendStatus(http.StatusNoContent)
}

// GetSearchHistory retrieves recent search history
func GetSearchHistory(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	limit := 10

	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	history, err := models.GetSearchHistory(userID, limit)
	if err != nil {
		log.Printf("Error fetching search history: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch history"})
	}

	return c.JSON(history)
}

// GetSearchSuggestions provides autocomplete suggestions
func GetSearchSuggestions(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	query := c.Query("q")
	limit := 5

	if query == "" {
		return c.JSON([]string{})
	}

	suggestions, err := models.GetSearchSuggestions(userID, query, limit)
	if err != nil {
		log.Printf("Error fetching suggestions: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch suggestions"})
	}

	return c.JSON(suggestions)
}
