package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

type TimelineEvent struct {
	ID   string      `json:"id"`
	Type string      `json:"type"` // "task", "note", or "report"
	Date time.Time   `json:"date"`
	Data interface{} `json:"data"`
}

type TimelineResponse struct {
	Events     []TimelineEvent `json:"events"`
	Total      int64           `json:"total"`
	Page       int             `json:"page"`
	Limit      int             `json:"limit"`
	TotalPages int             `json:"totalPages"`
	HasMore    bool            `json:"hasMore"`
}

type TimelineStats struct {
	TaskCount   int64 `json:"taskCount"`
	NoteCount   int64 `json:"noteCount"`
	ReportCount int64 `json:"reportCount"`
}

// GetPatientTimeline retrieves timeline events for a patient with pagination and filtering
func GetPatientTimeline(c *fiber.Ctx) error {
	patientID, err := strconv.Atoi(c.Params("patientId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid patient ID",
		})
	}

	// Pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Filter parameters
	eventType := c.Query("type", "all") // "all", "task", "note", "report"

	// Date range parameters
	var startDate, endDate *time.Time
	if startDateStr := c.Query("startDate"); startDateStr != "" {
		if parsed, err := time.Parse("2006-01-02", startDateStr); err == nil {
			startDate = &parsed
		}
	}
	if endDateStr := c.Query("endDate"); endDateStr != "" {
		if parsed, err := time.Parse("2006-01-02", endDateStr); err == nil {
			// Add one day to include the entire end date
			endOfDay := parsed.AddDate(0, 0, 1)
			endDate = &endOfDay
		}
	}

	// Collect all events
	var allEvents []TimelineEvent

	// Fetch tasks if needed
	if eventType == "all" || eventType == "task" {
		var tasks []models.Task
		query := config.DB.Where("patient_id = ?", patientID).
			Preload("Patient").
			Preload("AssignedTo").
			Preload("CreatedBy").
			Preload("Tags")

		if startDate != nil {
			query = query.Where("created_at >= ?", startDate)
		}
		if endDate != nil {
			query = query.Where("created_at < ?", endDate)
		}

		if err := query.Find(&tasks).Error; err == nil {
			for _, task := range tasks {
				allEvents = append(allEvents, TimelineEvent{
					ID:   "task-" + strconv.Itoa(int(task.ID)),
					Type: "task",
					Date: task.CreatedAt,
					Data: task,
				})
			}
		}
	}

	// Fetch notes if needed
	if eventType == "all" || eventType == "note" {
		var notes []models.PatientNote
		query := config.DB.Where("patient_id = ?", patientID).
			Preload("User")

		if startDate != nil {
			query = query.Where("created_at >= ?", startDate)
		}
		if endDate != nil {
			query = query.Where("created_at < ?", endDate)
		}

		if err := query.Find(&notes).Error; err == nil {
			for _, note := range notes {
				allEvents = append(allEvents, TimelineEvent{
					ID:   "note-" + strconv.Itoa(int(note.ID)),
					Type: "note",
					Date: note.CreatedAt,
					Data: note,
				})
			}
		}
	}

	// Fetch reports if needed
	if eventType == "all" || eventType == "report" {
		var reports []models.Report
		query := config.DB.Where("patient_id = ?", patientID).
			Preload("Tags")

		if startDate != nil {
			query = query.Where("report_date >= ?", startDate)
		}
		if endDate != nil {
			query = query.Where("report_date < ?", endDate)
		}

		if err := query.Find(&reports).Error; err == nil {
			for _, report := range reports {
				allEvents = append(allEvents, TimelineEvent{
					ID:   "report-" + strconv.Itoa(int(report.ID)),
					Type: "report",
					Date: report.ReportDate,
					Data: report,
				})
			}
		}
	}

	// Sort events by date descending (most recent first)
	sortEventsByDate(allEvents)

	// Calculate pagination
	total := int64(len(allEvents))
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	offset := (page - 1) * limit

	// Apply pagination
	var paginatedEvents []TimelineEvent
	if offset < len(allEvents) {
		end := offset + limit
		if end > len(allEvents) {
			end = len(allEvents)
		}
		paginatedEvents = allEvents[offset:end]
	}

	response := TimelineResponse{
		Events:     paginatedEvents,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
		HasMore:    page < totalPages,
	}

	return c.JSON(response)
}

// GetPatientTimelineStats returns counts for each event type
func GetPatientTimelineStats(c *fiber.Ctx) error {
	patientID, err := strconv.Atoi(c.Params("patientId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid patient ID",
		})
	}

	var stats TimelineStats

	// Count tasks
	config.DB.Model(&models.Task{}).Where("patient_id = ?", patientID).Count(&stats.TaskCount)

	// Count notes
	config.DB.Model(&models.PatientNote{}).Where("patient_id = ?", patientID).Count(&stats.NoteCount)

	// Count reports
	config.DB.Model(&models.Report{}).Where("patient_id = ?", patientID).Count(&stats.ReportCount)

	return c.JSON(stats)
}

// sortEventsByDate sorts timeline events by date descending
func sortEventsByDate(events []TimelineEvent) {
	for i := 0; i < len(events)-1; i++ {
		for j := i + 1; j < len(events); j++ {
			if events[i].Date.Before(events[j].Date) {
				events[i], events[j] = events[j], events[i]
			}
		}
	}
}
