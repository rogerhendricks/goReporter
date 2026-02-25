package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

// GlobalSearchResult represents a unified search result across all entities
type GlobalSearchResult struct {
	Type        string      `json:"type"` // "patient", "device", "report", "doctor", "task", "lead"
	ID          uint        `json:"id"`
	Title       string      `json:"title"`       // Main display text
	Subtitle    string      `json:"subtitle"`    // Secondary text
	Description string      `json:"description"` // Additional context
	URL         string      `json:"url"`         // Navigation URL
	Data        interface{} `json:"data"`        // Original entity data
	Score       float64     `json:"score"`       // Relevance score for ranking
}

// GlobalSearchParams contains search parameters
type GlobalSearchParams struct {
	Query      string   `query:"q"`
	EntityType string   `query:"type"` // Optional filter by entity type
	Limit      int      `query:"limit"`
	Offset     int      `query:"offset"`
	Filters    []string `query:"filters"` // Additional filters
}

// GlobalSearch performs a fuzzy search across all entities
func GlobalSearch(c *fiber.Ctx) error {
	var params GlobalSearchParams
	if err := c.QueryParser(&params); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid search parameters"})
	}

	// Default limit
	if params.Limit == 0 {
		params.Limit = 20
	}

	if params.Query == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Search query is required"})
	}

	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)

	// Initialize as empty slice to ensure JSON returns [] instead of null
	results := make([]GlobalSearchResult, 0)

	query := strings.ToLower(strings.TrimSpace(params.Query))

	// Search Patients
	if params.EntityType == "" || params.EntityType == "patient" {
		patients, err := searchPatients(query, userID, userRole, params.Limit)
		if err != nil {
			log.Printf("Error searching patients: %v", err)
		} else {
			results = append(results, patients...)
		}
	}

	// Search Doctors
	if params.EntityType == "" || params.EntityType == "doctor" {
		doctors, err := searchDoctors(query, params.Limit)
		if err != nil {
			log.Printf("Error searching doctors: %v", err)
		} else {
			results = append(results, doctors...)
		}
	}

	// Search Tasks
	if params.EntityType == "" || params.EntityType == "task" {
		tasks, err := searchTasks(query, userID, userRole, params.Limit)
		if err != nil {
			log.Printf("Error searching tasks: %v", err)
		} else {
			results = append(results, tasks...)
		}
	}

	// Sort results by relevance score (descending)
	sortByScore(results)

	// Apply offset and limit to combined results
	start := params.Offset
	if start > len(results) {
		start = len(results)
	}
	end := start + params.Limit
	if end > len(results) {
		end = len(results)
	}

	paginatedResults := results[start:end]

	return c.JSON(fiber.Map{
		"results": paginatedResults,
		"total":   len(results),
		"query":   params.Query,
	})
}

func searchPatients(query string, userID, userRole string, limit int) ([]GlobalSearchResult, error) {
	var patients []models.Patient
	var err error

	db := config.DB.Limit(limit).
		Preload("PatientDoctors.Doctor")

	if userRole != "admin" {
		db = db.Joins("JOIN patient_doctors ON patient_doctors.patient_id = patients.id").
			Joins("JOIN doctors ON doctors.id = patient_doctors.doctor_id").
			Where("doctors.user_id = ?", userID)
	}

	err = db.Where(
		"(LOWER(patients.first_name) LIKE ? OR LOWER(patients.last_name) LIKE ? OR CAST(patients.mrn AS TEXT) LIKE ? OR LOWER(patients.first_name || ' ' || patients.last_name) LIKE ?)",
		"%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%",
	).Find(&patients).Error

	if err != nil {
		return nil, err
	}

	log.Printf("Found %d patients for query '%s'", len(patients), query)

	var results []GlobalSearchResult
	for _, p := range patients {
		score := calculateScore(query, p.FirstName+" "+p.LastName)

		var simpleDoctors []map[string]interface{}
		for _, pd := range p.PatientDoctors {
			simpleDoctors = append(simpleDoctors, map[string]interface{}{
				"doctorId":  pd.DoctorID,
				"fullName":  pd.Doctor.FullName,
				"isPrimary": pd.IsPrimary,
			})
		}

		data := map[string]interface{}{
			"id":             p.ID,
			"mrn":            p.MRN,
			"fname":          p.FirstName,
			"lname":          p.LastName,
			"dob":            p.DOB,
			"patientDoctors": simpleDoctors,
		}

		results = append(results, GlobalSearchResult{
			Type:        "patient",
			ID:          p.ID,
			Title:       p.FirstName + " " + p.LastName,
			Subtitle:    "MRN: " + fmt.Sprintf("%d", p.MRN),
			Description: p.Email,
			URL:         "/patients/" + fmt.Sprintf("%d", p.ID),
			Data:        data,
			Score:       score,
		})
	}

	return results, nil
}

func searchDoctors(query string, limit int) ([]GlobalSearchResult, error) {
	var doctors []models.Doctor
	err := config.DB.Limit(limit).Where(
		"LOWER(full_name) LIKE ? OR LOWER(specialty) LIKE ?",
		"%"+query+"%", "%"+query+"%",
	).Find(&doctors).Error

	if err != nil {
		return nil, err
	}

	var results []GlobalSearchResult
	for _, d := range doctors {
		score := calculateScore(query, d.FullName)
		data := map[string]interface{}{
			"id":        d.ID,
			"fullName":  d.FullName,
			"specialty": d.Specialty,
			"email":     d.Email,
		}

		results = append(results, GlobalSearchResult{
			Type:        "doctor",
			ID:          d.ID,
			Title:       d.FullName,
			Subtitle:    d.Specialty,
			Description: d.Email,
			URL:         "/doctors/" + fmt.Sprintf("%d", d.ID),
			Data:        data,
			Score:       score,
		})
	}

	return results, nil
}

func searchTasks(query string, userID, userRole string, limit int) ([]GlobalSearchResult, error) {
	var tasks []models.Task
	db := config.DB.Limit(limit).
		Preload("AssignedTo").
		Preload("Patient")

	if userRole != "admin" {
		db = db.Where("assigned_to_id = ?", userID)
	}

	err := db.Where(
		"(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(status) LIKE ?)",
		"%"+query+"%", "%"+query+"%", "%"+query+"%",
	).Find(&tasks).Error

	if err != nil {
		return nil, err
	}

	var results []GlobalSearchResult
	for _, t := range tasks {
		assignedTo := "Unassigned"
		if t.AssignedTo.ID != 0 {
			assignedTo = t.AssignedTo.FullName
		}

		score := calculateScore(query, t.Title)
		data := map[string]interface{}{
			"id":        t.ID,
			"title":     t.Title,
			"status":    t.Status,
			"priority":  t.Priority,
			"dueDate":   t.DueDate,
			"patientId": t.PatientID,
		}

		results = append(results, GlobalSearchResult{
			Type:        "task",
			ID:          t.ID,
			Title:       t.Title,
			Subtitle:    "Status: " + string(t.Status),
			Description: "Assigned to: " + assignedTo,
			URL:         "/tasks/" + fmt.Sprintf("%d", t.ID),
			Data:        data,
			Score:       score,
		})
	}

	return results, nil
}

// calculateScore provides a simple relevance scoring
// More sophisticated algorithms (Levenshtein distance, etc.) can be added
func calculateScore(query, target string) float64 {
	query = strings.ToLower(query)
	target = strings.ToLower(target)

	// Exact match scores highest
	if query == target {
		return 100.0
	}

	// Starts with query scores high
	if strings.HasPrefix(target, query) {
		return 80.0
	}

	// Contains query scores medium
	if strings.Contains(target, query) {
		return 60.0
	}

	// Word boundary match
	words := strings.Fields(target)
	for _, word := range words {
		if strings.HasPrefix(word, query) {
			return 70.0
		}
		if strings.Contains(word, query) {
			return 50.0
		}
	}

	// Fuzzy match (simple character overlap)
	overlap := 0
	for _, char := range query {
		if strings.ContainsRune(target, char) {
			overlap++
		}
	}
	fuzzyScore := (float64(overlap) / float64(len(query))) * 40.0

	return fuzzyScore
}

// sortByScore sorts results by score in descending order
func sortByScore(results []GlobalSearchResult) {
	// Simple bubble sort (for larger datasets, use sort.Slice)
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].Score > results[i].Score {
				results[i], results[j] = results[j], results[i]
			}
		}
	}
}
