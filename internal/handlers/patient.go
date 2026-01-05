package handlers

import (
	"encoding/json"
	"errors"
	"html"
	"log"
	"net/http"

	// "regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/rogerhendricks/goReporter/internal/utils"
	"gorm.io/gorm"
)

// Helpers
func parseRFC3339OrDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, errors.New("empty")
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	// Fallback for "YYYY-MM-DD"
	return time.Parse("2006-01-02", s)
}

func parseOptionalTimePtr(s string) (*time.Time, error) {
	t, err := parseRFC3339OrDate(s)
	if err != nil {
		return nil, nil // treat invalid/empty as NULL
	}
	return &t, nil
}

// --- DTOs for API Responses ---

type PatientResponse struct {
	ID             uint                      `json:"id"`
	MRN            int                       `json:"mrn"`
	Fname          string                    `json:"fname"`
	Lname          string                    `json:"lname"`
	Dob            string                    `json:"dob"`
	Phone          string                    `json:"phone"`
	Email          string                    `json:"email"`
	Street         string                    `json:"street"`
	City           string                    `json:"city"`
	State          string                    `json:"state"`
	Country        string                    `json:"country"`
	Postal         string                    `json:"postal"`
	PatientDoctors []PatientDoctorResponse   `json:"patientDoctors"`
	Devices        []ImplantedDeviceResponse `json:"devices"`
	Leads          []ImplantedLeadResponse   `json:"leads"`
	Reports        []ReportResponse          `json:"reports"`
	ReportCount    int                       `json:"reportCount"`
	CreatedAt      time.Time                 `json:"createdAt"`
	UpdatedAt      time.Time                 `json:"updatedAt"`
	Tags           []models.Tag              `json:"tags"`
}

type PatientDoctorResponse struct {
	ID        uint            `json:"id"`
	DoctorID  uint            `json:"doctorId"`
	AddressID *uint           `json:"addressId"`
	IsPrimary bool            `json:"isPrimary"`
	Doctor    DoctorResponse  `json:"doctor"`
	Address   *models.Address `json:"address"`
}

type ImplantedDeviceResponse struct {
	ID          uint           `json:"id"`
	DeviceID    uint           `json:"deviceId"`
	Serial      string         `json:"serial"`
	Status      string         `json:"status"`
	ImplantedAt time.Time      `json:"implantedAt"`
	ExplantedAt *time.Time     `json:"explantedAt"`
	Device      DeviceResponse `json:"device"`
}

type ImplantedLeadResponse struct {
	ID          uint         `json:"id"`
	LeadID      uint         `json:"leadId"`
	Serial      string       `json:"serial"`
	Chamber     string       `json:"chamber"`
	Status      string       `json:"status"`
	ImplantedAt time.Time    `json:"implantedAt"`
	ExplantedAt *time.Time   `json:"explantedAt"`
	Lead        LeadResponse `json:"lead"`
}

func toDeviceResponse(device models.Device) DeviceResponse {
	return DeviceResponse{
		ID:           device.ID,
		Name:         device.Name,
		Manufacturer: device.Manufacturer,
		Model:        device.DevModel,
		Type:         device.Type,
		IsMri:        device.IsMri,
	}
}

func toLeadResponse(lead models.Lead) LeadResponse {
	return LeadResponse{
		ID:           lead.ID,
		Name:         lead.Name,
		Manufacturer: lead.Manufacturer,
		LeadModel:    lead.LeadModel,
		Connector:    lead.Connector,
		IsMri:        lead.IsMri,
	}
}

func toPatientResponse(patient models.Patient) PatientResponse {
	// This function maps the GORM model to the API response struct.
	// You can create similar helpers for other models.
	resp := PatientResponse{
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

	// Map nested slices
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
	for _, d := range patient.ImplantedDevices {
		resp.Devices = append(resp.Devices, ImplantedDeviceResponse{
			ID:          d.ID,
			DeviceID:    d.DeviceID,
			Serial:      d.Serial,
			Status:      d.Status,
			ImplantedAt: d.ImplantedAt,
			ExplantedAt: d.ExplantedAt,
			Device:      toDeviceResponse(d.Device),
		})
	}
	for _, l := range patient.ImplantedLeads {
		resp.Leads = append(resp.Leads, ImplantedLeadResponse{
			ID:          l.ID,
			LeadID:      l.LeadID,
			Serial:      l.Serial,
			Chamber:     l.Chamber,
			Status:      l.Status,
			ImplantedAt: l.ImplantedAt,
			ExplantedAt: l.ExplantedAt,
			Lead:        toLeadResponse(l.Lead),
		})
	}
	// Map reports if needed, assuming a toReportResponse exists
	// for _, r := range patient.Reports {
	// 	resp.Report = append(resp.Report, toReportResponse(r))
	// }

	// Map tags
	if len(patient.Tags) > 0 {
		resp.Tags = patient.Tags
	} else {
		resp.Tags = []models.Tag{}
	}

	// Map reports (needed for patient detail views like QRS chart)
	if len(patient.Reports) > 0 {
		resp.Reports = make([]ReportResponse, 0, len(patient.Reports))
		for _, r := range patient.Reports {
			resp.Reports = append(resp.Reports, toReportResponse(r))
		}
	} else {
		resp.Reports = []ReportResponse{}
	}

	return resp
}

// GetPatients retrieves all patients with optional search
func GetPatients(c *fiber.Ctx) error {
	searchQuery := c.Query("search")
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)

	var patients []models.Patient
	var err error

	// Admin users can see all patients
	switch userRole {
	case "admin", "user":
		if searchQuery != "" {
			patients, err = models.SearchPatients(searchQuery)
		} else {
			patients, err = models.GetAllPatients()
		}
	case "doctor":
		// Doctor users can only see their assigned patients
		patients, err = models.GetPatientsForDoctor(userID)
		if err != nil {
			log.Printf("Error fetching patients for doctor %s: %v", userID, err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
		}

		// If there's a search query, filter the doctor's patients
		if searchQuery != "" {
			var filteredPatients []models.Patient
			searchLower := strings.ToLower(searchQuery)
			for _, p := range patients {
				if strings.Contains(strings.ToLower(p.FirstName), searchLower) ||
					strings.Contains(strings.ToLower(p.LastName), searchLower) ||
					strings.Contains(strconv.Itoa(p.MRN), searchQuery) {
					filteredPatients = append(filteredPatients, p)
				}
			}
			patients = filteredPatients
		}
	default:
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
	}

	if err != nil {
		log.Printf("Error fetching patients: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
	}

	return c.JSON(patients)
}

// func GetPatientsBasic(c *fiber.Ctx) error {
// 	userID := c.Locals("userID").(string)
// 	userRole := c.Locals("userRole").(string)
// 	var patients []models.Patient
// 	var err error

// 	// Admin
// 	switch userRole {
// 	case "admin", "user":
// 		patients, err = models.GetAllPatientsBasic()
// 	case "doctor":
// 		patients, err = models.GetPatientsForDoctorBasic(userID)
// 	default:
// 		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
// 	}
// 	if err != nil {
// 		log.Printf("Error fetching basic patients: %v", err)
// 		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
// 	}
// 	return c.JSON(patients)
// }

// GetAllPatients retrieves all patients (alternative endpoint)
func GetAllPatients(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)

	var patients []models.Patient
	var err error

	// Admin users can see all patients
	switch userRole {
	case "admin", "user":
		patients, err = models.GetAllPatients()
	case "doctor":
		// Doctor users can only see their assigned patients
		patients, err = models.GetPatientsForDoctor(userID)
	default:
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
	}

	if err != nil {
		log.Printf("Error fetching all patients: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
	}

	var patientResponses []PatientResponse
	for _, p := range patients {
		patientResponses = append(patientResponses, toPatientResponse(p))
	}

	return c.JSON(patientResponses)
}

// GetMostRecentPatientList retrieves the most recent patients
func GetMostRecentPatientList(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)

	var patients []models.Patient
	var err error

	// Admin users can see all patients
	switch userRole {
	case "admin", "user":
		patients, err = models.GetMostRecentPatientList()
	case "doctor":
		// Doctor users can only see their assigned patients (we'll get all and limit to recent)
		allPatients, err := models.GetPatientsForDoctor(userID)
		if err != nil {
			log.Printf("Error fetching patients for doctor %s: %v", userID, err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
		}
		// Limit to 10 most recent for doctors too
		if len(allPatients) > 10 {
			patients = allPatients[:10]
		} else {
			patients = allPatients
		}
	default:
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
	}

	if err != nil {
		log.Printf("Error fetching all patients: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
	}

	var patientResponses []PatientResponse
	for _, p := range patients {
		patientResponses = append(patientResponses, toPatientResponse(p))
	}

	return c.JSON(patientResponses)
}

// GetPatientsPaginated retrieves patients with pagination based on user role
func GetPatientsPaginated(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "25"))
	search := html.EscapeString(strings.TrimSpace(c.Query("search", "")))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}

	var patients []models.Patient
	var total int64
	var err error

	// Role-based patient retrieval
	switch userRole {
	case "admin", "user":
		patients, total, err = models.GetPatientsPaginated(search, page, limit)
	case "doctor":
		patients, total, err = models.GetPatientsPaginatedForDoctor(userID, search, page, limit)
	default:
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
	}

	if err != nil {
		log.Printf("Error fetching paginated patients: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
	}

	// Map to response format
	var patientResponses []PatientResponse
	for _, p := range patients {
		patientResponses = append(patientResponses, toPatientResponse(p))
	}

	// Return paginated response
	return c.JSON(fiber.Map{
		"data": patientResponses,
		"pagination": fiber.Map{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		},
	})
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

	return c.JSON(toPatientResponse(*patient))
}

func CreatePatient(c *fiber.Ctx) error {
	// 1. Define a temporary struct (DTO) to match the incoming JSON exactly
	var input struct {
		MRN            int    `json:"mrn"`
		Fname          string `json:"fname"`
		Lname          string `json:"lname"`
		Dob            string `json:"dob"` // Accept date as string
		Phone          string `json:"phone"`
		Email          string `json:"email"`
		Street         string `json:"street"`
		City           string `json:"city"`
		State          string `json:"state"`
		Country        string `json:"country"`
		Postal         string `json:"postal"`
		PatientDoctors []struct {
			DoctorID  uint  `json:"doctorId"`
			AddressID *uint `json:"addressId"`
			IsPrimary bool  `json:"isPrimary"`
		} `json:"patientDoctors"`
		Devices []struct {
			DeviceID    uint   `json:"deviceId"`
			Serial      string `json:"serial"`
			Status      string `json:"status"`
			ImplantedAt string `json:"implantedAt"` // Accept date as string
			ExplantedAt string `json:"explantedAt"` // Accept date as string
		} `json:"devices"`
		Leads []struct {
			LeadID      uint   `json:"leadId"`
			Serial      string `json:"serial"`
			Chamber     string `json:"chamber"`
			Status      string `json:"status"`
			ImplantedAt string `json:"implantedAt"` // Accept date as string
			ExplantedAt string `json:"explantedAt"` // Accept date as string
		} `json:"leads"`
		Medications []interface{} `json:"medications"`
		Tags        []uint        `json:"tags"` // Array of Tag IDs
	}

	// 2. Parse the request body into the temporary struct
	if err := c.BodyParser(&input); err != nil {
		log.Printf("Error parsing patient creation request: %v", err)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
	}

	// 3. Map the DTO to your GORM models
	newPatient := models.Patient{
		MRN:       input.MRN,
		FirstName: input.Fname,
		LastName:  input.Lname,
		DOB:       input.Dob,
		Phone:     input.Phone,
		Email:     input.Email,
		Street:    input.Street,
		City:      input.City,
		State:     input.State,
		Country:   input.Country,
		Postal:    input.Postal,
	}

	// Validate and sanitize the main patient data
	if err := validatePatient(&newPatient); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	sanitizePatient(&newPatient)

	// Create patient first to get an ID
	// if err := models.CreatePatient(&newPatient); err != nil {
	//     log.Printf("Error creating patient: %v", err)
	//     if strings.Contains(err.Error(), "duplicate") {
	//         return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Patient with this MRN already exists"})
	//     }
	//     return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create patient"})
	// }

	// // 4. Now handle the relationships, converting dates as you go
	// for _, d := range input.Devices {
	//     var implantDate time.Time
	//     var err error
	//     if d.ImplantedAt == "" {
	//         implantDate = time.Now() // Default to today's date if not provided
	//     } else {
	//         implantDate, err = time.Parse("2006-01-02", d.ImplantedAt)
	//         if err != nil {
	//             log.Printf("Warning: could not parse device implant date '%s'. Defaulting to today. Error: %v", d.ImplantedAt, err)
	//             implantDate = time.Now()
	//         }
	//     }
	//     implantedDevice := models.ImplantedDevice{
	//         PatientID:   newPatient.ID,
	//         DeviceID:    d.DeviceID,
	//         Serial:      d.Serial,
	//         ImplantedAt: implantDate,
	//     }
	//     config.DB.Create(&implantedDevice)
	// }

	// for _, l := range input.Leads {
	//     var implantDate time.Time
	//     var err error
	//     if l.ImplantedAt == "" {
	//         implantDate = time.Now() // Default to today's date if not provided
	//     } else {
	//         implantDate, err = time.Parse("2006-01-02", l.ImplantedAt)
	//         if err != nil {
	//             log.Printf("Warning: could not parse lead implant date '%s'. Defaulting to today. Error: %v", l.ImplantedAt, err)
	//             implantDate = time.Now()
	//         }
	//     }
	//     implantedLead := models.ImplantedLead{
	//         PatientID:   newPatient.ID,
	//         LeadID:      l.LeadID,
	//         Serial:      l.Serial,
	//         Chamber:     l.Chamber,
	//         Status:      l.Status,
	//         ImplantedAt: implantDate,
	//     }
	//     config.DB.Create(&implantedLead)
	// }

	// for _, pd := range input.PatientDoctors {
	//     patientDoctor := models.PatientDoctor{
	//         PatientID: newPatient.ID,
	//         DoctorID:  pd.DoctorID,
	//         AddressID: pd.AddressID,
	//         IsPrimary: pd.IsPrimary,
	//     }
	//     config.DB.Create(&patientDoctor)
	// }

	for _, pd := range input.PatientDoctors {
		newPatient.PatientDoctors = append(newPatient.PatientDoctors, models.PatientDoctor{
			DoctorID:  pd.DoctorID,
			AddressID: pd.AddressID,
			IsPrimary: pd.IsPrimary,
		})
	}
	for _, d := range input.Devices {
		implAt, err := parseRFC3339OrDate(d.ImplantedAt)
		if err != nil {
			implAt = time.Now().UTC()
		}
		expAt, _ := parseOptionalTimePtr(d.ExplantedAt)
		newPatient.ImplantedDevices = append(newPatient.ImplantedDevices, models.ImplantedDevice{
			DeviceID:    d.DeviceID,
			Serial:      d.Serial,
			Status:      d.Status,
			ImplantedAt: implAt,
			ExplantedAt: expAt,
		})
	}
	for _, l := range input.Leads {
		implAt, err := parseRFC3339OrDate(l.ImplantedAt)
		if err != nil {
			implAt = time.Now().UTC()
		}
		expAt, _ := parseOptionalTimePtr(l.ExplantedAt)
		newPatient.ImplantedLeads = append(newPatient.ImplantedLeads, models.ImplantedLead{
			LeadID:      l.LeadID,
			Serial:      l.Serial,
			Chamber:     l.Chamber,
			Status:      l.Status,
			ImplantedAt: implAt,
			ExplantedAt: expAt,
		})
	}

	// Handle Tags
	if len(input.Tags) > 0 {
		var tags []models.Tag
		if err := config.DB.Where("id IN ?", input.Tags).Find(&tags).Error; err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch tags"})
		}
		newPatient.Tags = tags
	}

	// Create patient and all associations in one transaction
	if err := config.DB.Session(&gorm.Session{FullSaveAssociations: true}).Create(&newPatient).Error; err != nil {
		log.Printf("Error creating patient with associations: %v", err)
		if strings.Contains(err.Error(), "duplicate") {
			return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Patient with this MRN already exists"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create patient"})
	}

	// Fetch the complete patient with all relationships to return
	createdPatient, err := models.GetPatientByID(newPatient.ID)
	if err != nil {
		log.Printf("Error fetching created patient: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Patient created but failed to fetch complete data"})
	}

	return c.Status(http.StatusCreated).JSON(toPatientResponse(*createdPatient))
}

// UpdatePatient updates an existing patient
func UpdatePatient(c *fiber.Ctx) error {
	patientID := c.Params("id")

	id, err := strconv.ParseUint(patientID, 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patient ID format"})
	}

	// Define an input struct that captures addressId as raw JSON
	// Use pointers to distinguish between missing fields (nil) and empty values
	var input struct {
		MRN            *int    `json:"mrn"`
		Fname          *string `json:"fname"`
		Lname          *string `json:"lname"`
		Dob            *string `json:"dob"`
		Phone          *string `json:"phone"`
		Email          *string `json:"email"`
		Street         *string `json:"street"`
		City           *string `json:"city"`
		State          *string `json:"state"`
		Country        *string `json:"country"`
		Postal         *string `json:"postal"`
		PatientDoctors *[]struct {
			DoctorID  uint             `json:"doctorId"`
			AddressID *json.RawMessage `json:"addressId"` // Capture as raw JSON
			IsPrimary bool             `json:"isPrimary"`
		} `json:"patientDoctors"`
		Devices *[]struct {
			DeviceID    uint   `json:"deviceId"`
			Serial      string `json:"serial"`
			Status      string `json:"status"`
			ImplantedAt string `json:"implantedAt"`
			ExplantedAt string `json:"explantedAt"`
		} `json:"devices"`
		Leads *[]struct {
			LeadID      uint   `json:"leadId"`
			Serial      string `json:"serial"`
			Chamber     string `json:"chamber"`
			Status      string `json:"status"`
			ImplantedAt string `json:"implantedAt"`
			ExplantedAt string `json:"explantedAt"`
		} `json:"leads"`
		Tags *[]uint `json:"tags"`
	}

	if err := json.Unmarshal(c.Body(), &input); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format: " + err.Error()})
	}

	// Debug logging
	if input.Devices != nil {
		for i, d := range *input.Devices {
			log.Printf("Device %d: DeviceID=%d, Serial=%s, Status=%s", i, d.DeviceID, d.Serial, d.Status)
		}
	}
	if input.Leads != nil {
		for i, l := range *input.Leads {
			log.Printf("Lead %d: LeadID=%d, Serial=%s, Chamber=%s", i, l.LeadID, l.Serial, l.Chamber)
		}
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start transaction"})
	}

	existingPatient, err := models.GetPatientByIDForUpdate(uint(id), tx)
	if err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Patient not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve patient for update"})
	}

	// Update main patient fields only if they are present in the request
	if input.MRN != nil {
		existingPatient.MRN = *input.MRN
	}
	if input.Fname != nil {
		existingPatient.FirstName = *input.Fname
	}
	if input.Lname != nil {
		existingPatient.LastName = *input.Lname
	}
	if input.Dob != nil {
		existingPatient.DOB = *input.Dob
	}
	if input.Phone != nil {
		existingPatient.Phone = *input.Phone
	}
	if input.Email != nil {
		existingPatient.Email = *input.Email
	}
	if input.Street != nil {
		existingPatient.Street = *input.Street
	}
	if input.City != nil {
		existingPatient.City = *input.City
	}
	if input.State != nil {
		existingPatient.State = *input.State
	}
	if input.Country != nil {
		existingPatient.Country = *input.Country
	}
	if input.Postal != nil {
		existingPatient.Postal = *input.Postal
	}

	if err := tx.Save(&existingPatient).Error; err != nil {
		tx.Rollback()
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update patient details"})
	}

	// Update associations only if they are present in the request

	// Patient Doctors
	if input.PatientDoctors != nil {
		// Clear existing associations
		tx.Where("patient_id = ?", existingPatient.ID).Delete(&models.PatientDoctor{})

		// Create new associations from the payload
		for _, pd := range *input.PatientDoctors {
			// Manually parse the addressId from the raw JSON
			var addrID *uint
			if pd.AddressID != nil && string(*pd.AddressID) != "null" {
				var id uint
				if err := json.Unmarshal(*pd.AddressID, &id); err == nil {
					addrID = &id
				}
			}
			newPatientDoctor := models.PatientDoctor{
				PatientID: existingPatient.ID,
				DoctorID:  pd.DoctorID,
				AddressID: addrID, // Use the manually parsed ID
				IsPrimary: pd.IsPrimary,
			}
			if err := tx.Create(&newPatientDoctor).Error; err != nil {
				tx.Rollback()
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create new doctor association"})
			}
		}
	}

	// Devices
	if input.Devices != nil {
		tx.Where("patient_id = ?", existingPatient.ID).Delete(&models.ImplantedDevice{})

		for _, d := range *input.Devices {
			implAt, err := parseRFC3339OrDate(d.ImplantedAt)
			if err != nil {
				implAt = time.Now().UTC()
			}
			expAt, _ := parseOptionalTimePtr(d.ExplantedAt)
			dev := models.ImplantedDevice{
				PatientID:   existingPatient.ID,
				DeviceID:    d.DeviceID,
				Serial:      d.Serial,
				Status:      d.Status,
				ImplantedAt: implAt,
				ExplantedAt: expAt,
			}
			log.Printf("Creating ImplantedDevice: PatientID=%d, DeviceID=%d, Serial=%s", dev.PatientID, dev.DeviceID, dev.Serial)
			if err := tx.Create(&dev).Error; err != nil {
				tx.Rollback()
				log.Printf("Error creating device: %v", err)
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create new device association"})
			}
			log.Printf("Successfully created ImplantedDevice with ID=%d, DeviceID after save=%d", dev.ID, dev.DeviceID)

			// Verify what was actually saved
			var savedDev models.ImplantedDevice
			if err := tx.First(&savedDev, dev.ID).Error; err == nil {
				log.Printf("Verification: ImplantedDevice ID=%d has DeviceID=%d in database", savedDev.ID, savedDev.DeviceID)
			}
		}
	}

	// Leads
	if input.Leads != nil {
		tx.Where("patient_id = ?", existingPatient.ID).Delete(&models.ImplantedLead{})

		for _, l := range *input.Leads {
			implAt, err := parseRFC3339OrDate(l.ImplantedAt)
			if err != nil {
				implAt = time.Now().UTC()
			}
			expAt, _ := parseOptionalTimePtr(l.ExplantedAt)
			lead := models.ImplantedLead{
				PatientID:   existingPatient.ID,
				LeadID:      l.LeadID,
				Serial:      l.Serial,
				Chamber:     l.Chamber,
				Status:      l.Status,
				ImplantedAt: implAt,
				ExplantedAt: expAt,
			}
			log.Printf("Creating ImplantedLead: PatientID=%d, LeadID=%d, Serial=%s", lead.PatientID, lead.LeadID, lead.Serial)
			if err := tx.Create(&lead).Error; err != nil {
				tx.Rollback()
				log.Printf("Error creating lead: %v", err)
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create new lead association"})
			}
			log.Printf("Successfully created ImplantedLead with ID=%d", lead.ID)
		}
	}

	// Handle Tags
	if input.Tags != nil {
		if err := tx.Model(&existingPatient).Association("Tags").Clear(); err != nil {
			tx.Rollback()
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to clear tags"})
		}
		if len(*input.Tags) > 0 {
			var tags []models.Tag
			if err := tx.Where("id IN ?", *input.Tags).Find(&tags).Error; err != nil {
				tx.Rollback()
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch tags"})
			}
			if err := tx.Model(&existingPatient).Association("Tags").Replace(tags); err != nil {
				tx.Rollback()
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update tags"})
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to commit transaction"})
	}

	updatedPatient, err := models.GetPatientByID(existingPatient.ID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch updated patient data"})
	}

	return c.Status(http.StatusOK).JSON(toPatientResponse(*updatedPatient))
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

func SearchPatients(c *fiber.Ctx) error {
	searchQuery := c.Query("search")
	searchQuery = html.EscapeString(strings.TrimSpace(searchQuery))

	if searchQuery == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Search query is required"})
	}

	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)

	var patients []models.Patient
	var err error

	// Admin users can search all patients
	switch userRole {
	case "admin", "user":
		patients, err = models.SearchPatients(searchQuery)
		if err != nil {
			// Check for the specific "too many results" error from the model
			if strings.Contains(err.Error(), "too many results") {
				return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
			}
			log.Printf("Error searching patients: %v", err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to search patients"})
		}
	case "doctor":
		// Doctor users search within their assigned patients
		allPatients, err := models.GetPatientsForDoctor(userID)
		if err != nil {
			log.Printf("Error fetching patients for doctor %s: %v", userID, err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch patients"})
		}

		// Filter the doctor's patients by search query
		var filteredPatients []models.Patient
		searchLower := strings.ToLower(searchQuery)
		for _, p := range allPatients {
			if strings.Contains(strings.ToLower(p.FirstName), searchLower) ||
				strings.Contains(strings.ToLower(p.LastName), searchLower) ||
				strings.Contains(strconv.Itoa(p.MRN), searchQuery) {
				filteredPatients = append(filteredPatients, p)
			}
		}
		patients = filteredPatients
	default:
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
	}

	if patients == nil {
		return c.JSON([]PatientResponse{}) // Return empty array if no patients found
	}
	if len(patients) == 0 {
		return c.JSON([]models.Patient{})
	}

	var patientResponses []PatientResponse
	for _, p := range patients {
		patientResponses = append(patientResponses, toPatientResponse(p))
	}

	return c.JSON(patientResponses)
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

// func validatePatientUpdate(patient *models.Patient) error {
// 	if patient.Email != "" && !utils.IsValidEmail(patient.Email) {
// 		return errors.New("invalid email format")
// 	}
// 	return nil
// }

// //

// func validatePatientInput(fname, lname, email string, mrn int) error {
// 	if strings.TrimSpace(fname) == "" {
// 		return errors.New("first name is required")
// 	}
// 	if strings.TrimSpace(lname) == "" {
// 		return errors.New("last name is required")
// 	}
// 	if mrn == 0 {
// 		return errors.New("MRN is required and cannot be zero")
// 	}

// 	// Example email validation
// 	if email != "" {
// 		// A simple regex for email validation
// 		emailRegex := regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,4}$`)
// 		if !emailRegex.MatchString(email) {
// 			return errors.New("invalid email format")
// 		}
// 	}
// 	return nil
// }

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

// func updatePatientFields(existing *models.Patient, update *models.Patient) {
// 	if update.MRN != 0 {
// 		existing.MRN = update.MRN
// 	}
// 	if update.FirstName != "" {
// 		existing.FirstName = html.EscapeString(strings.TrimSpace(update.FirstName))
// 	}
// 	if update.LastName != "" {
// 		existing.LastName = html.EscapeString(strings.TrimSpace(update.LastName))
// 	}
// 	if update.DOB != "" {
// 		existing.DOB = update.DOB
// 	}
// 	if update.Gender != "" {
// 		existing.Gender = update.Gender
// 	}
// 	if update.Email != "" {
// 		existing.Email = html.EscapeString(strings.TrimSpace(update.Email))
// 	}
// 	if update.Phone != "" {
// 		existing.Phone = html.EscapeString(strings.TrimSpace(update.Phone))
// 	}
// 	if update.Street != "" {
// 		existing.Street = html.EscapeString(strings.TrimSpace(update.Street))
// 	}
// 	if update.City != "" {
// 		existing.City = html.EscapeString(strings.TrimSpace(update.City))
// 	}
// 	if update.State != "" {
// 		existing.State = html.EscapeString(strings.TrimSpace(update.State))
// 	}
// 	if update.Country != "" {
// 		existing.Country = html.EscapeString(strings.TrimSpace(update.Country))
// 	}
// 	if update.Postal != "" {
// 		existing.Postal = html.EscapeString(strings.TrimSpace(update.Postal))
// 	}
// }

// func createPatientRelationships(patientID uint, patientDoctors []models.PatientDoctor, devices []models.ImplantedDevice, leads []models.ImplantedLead) error {
// 	// Create patient-doctor relationships
// 	for _, pd := range patientDoctors {
// 		pd.PatientID = patientID
// 		if err := config.DB.Create(&pd).Error; err != nil {
// 			return err
// 		}
// 	}

// 	// Create implanted devices
// 	for _, device := range devices {
// 		device.PatientID = patientID
// 		if device.ImplantedAt.IsZero() {
// 			device.ImplantedAt = time.Now()
// 		}
// 		if err := config.DB.Create(&device).Error; err != nil {
// 			return err
// 		}
// 	}

// 	// Create implanted leads
// 	for _, lead := range leads {
// 		lead.PatientID = patientID
// 		if lead.ImplantedAt.IsZero() {
// 			lead.ImplantedAt = time.Now()
// 		}
// 		if err := config.DB.Create(&lead).Error; err != nil {
// 			return err
// 		}
// 	}

// 	return nil
// }

// func updatePatientRelationships(patientID uint, patientDoctors []models.PatientDoctor, devices []models.ImplantedDevice, leads []models.ImplantedLead) error {
// 	// Update patient-doctor relationships (replace all)
// 	if patientDoctors != nil {
// 		// Delete existing relationships
// 		if err := config.DB.Where("patient_id = ?", patientID).Delete(&models.PatientDoctor{}).Error; err != nil {
// 			return err
// 		}

// 		// Create new relationships
// 		for _, pd := range patientDoctors {
// 			pd.PatientID = patientID
// 			if err := config.DB.Create(&pd).Error; err != nil {
// 				return err
// 			}
// 		}
// 	}

// 	// Similar logic for devices and leads if needed
// 	return nil
// }

// GetOverduePatients retrieves patients who are overdue for reports
func GetOverduePatients(c *fiber.Ctx) error {
	// Get pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	// Check if user is a doctor and filter by their patients
	var doctorID *uint
	userRole, _ := c.Locals("user_role").(string)
	if userRole == "doctor" {
		userIDStr, _ := c.Locals("user_id").(string)
		if userIDStr != "" {
			// Get doctor record by user ID
			var doctor models.Doctor
			if err := config.DB.Where("user_id = ?", userIDStr).First(&doctor).Error; err == nil {
				doctorID = &doctor.ID
			}
		}
	}

	// Get overdue patients
	results, total, err := models.GetOverduePatients(page, limit, doctorID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve overdue patients",
		})
	}

	// Ensure results is never nil for JSON serialization
	if results == nil {
		results = []models.OverduePatient{}
	}

	// Calculate total pages
	totalPages := (int(total) + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return c.JSON(fiber.Map{
		"patients":   results,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": totalPages,
	})
}
