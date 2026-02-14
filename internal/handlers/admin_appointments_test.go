package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/rogerhendricks/goReporter/internal/testutil"
)

type adminAppointmentsResponse struct {
	Data       []models.Appointment `json:"data"`
	Pagination struct {
		Page       int   `json:"page"`
		Limit      int   `json:"limit"`
		Total      int64 `json:"total"`
		TotalPages int   `json:"totalPages"`
	} `json:"pagination"`
	GraceMinutes int `json:"graceMinutes"`
	LookbackDays int `json:"lookbackDays"`
}

func setupAdminAppointmentsTestApp(t *testing.T) *fiber.App {
	t.Helper()
	testutil.SetupTestEnv(t)
	t.Setenv("MISSED_GRACE_MINUTES", "15")
	t.Setenv("MISSED_LOOKBACK_DAYS", "7")

	if err := config.DB.AutoMigrate(&models.Appointment{}, &models.AppointmentSlot{}); err != nil {
		t.Fatalf("failed to migrate appointment models: %v", err)
	}

	app := fiber.New()
	app.Get("/api/admin/appointments", GetAdminAppointments)
	app.Post("/api/admin/appointments/missed-letter", MarkMissedLettersSent)
	return app
}

func seedAppointmentFixtures(t *testing.T) (*models.Patient, *models.User) {
	t.Helper()

	patient := &models.Patient{
		MRN:       1001,
		FirstName: "Pat",
		LastName:  "Ient",
	}
	if err := config.DB.Create(patient).Error; err != nil {
		t.Fatalf("failed to seed patient: %v", err)
	}

	user := &models.User{
		Username: "admin",
		Email:    "admin@example.com",
		Password: "secret",
		Role:     "admin",
	}
	if err := config.DB.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	return patient, user
}

func TestGetAdminAppointments_MissedFilterRespectsGrace(t *testing.T) {
	app := setupAdminAppointmentsTestApp(t)
	patient, user := seedAppointmentFixtures(t)

	now := time.Now().UTC()

	missed := models.Appointment{
		Title:       "Past scheduled",
		Location:    models.AppointmentLocationClinic,
		Status:      models.AppointmentStatusScheduled,
		StartAt:     now.Add(-30 * time.Minute),
		PatientID:   patient.ID,
		CreatedByID: user.ID,
	}
	inGrace := models.Appointment{
		Title:       "In grace window",
		Location:    models.AppointmentLocationClinic,
		Status:      models.AppointmentStatusScheduled,
		StartAt:     now.Add(-5 * time.Minute),
		PatientID:   patient.ID,
		CreatedByID: user.ID,
	}
	completed := models.Appointment{
		Title:       "Completed",
		Location:    models.AppointmentLocationClinic,
		Status:      models.AppointmentStatusCompleted,
		StartAt:     now.Add(-1 * time.Hour),
		PatientID:   patient.ID,
		CreatedByID: user.ID,
	}

	if err := config.DB.Create(&missed).Error; err != nil {
		t.Fatalf("failed to seed missed appointment: %v", err)
	}
	if err := config.DB.Create(&inGrace).Error; err != nil {
		t.Fatalf("failed to seed in-grace appointment: %v", err)
	}
	if err := config.DB.Create(&completed).Error; err != nil {
		t.Fatalf("failed to seed completed appointment: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/admin/appointments?filter=missed", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}

	var payload adminAppointmentsResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if payload.GraceMinutes != 15 {
		t.Fatalf("expected graceMinutes 15, got %d", payload.GraceMinutes)
	}
	if payload.LookbackDays != 7 {
		t.Fatalf("expected lookbackDays 7, got %d", payload.LookbackDays)
	}

	if payload.Pagination.Total != 1 {
		t.Fatalf("expected total 1 missed appointment, got %d", payload.Pagination.Total)
	}

	if len(payload.Data) != 1 || payload.Data[0].ID != missed.ID {
		t.Fatalf("expected only the missed appointment, got %+v", payload.Data)
	}
}

func TestGetAdminAppointments_PaginatesWithLimit(t *testing.T) {
	app := setupAdminAppointmentsTestApp(t)
	patient, user := seedAppointmentFixtures(t)

	now := time.Now().UTC()

	// Create 16 missed appointments to force a second page (default limit=15)
	for i := 0; i < 16; i++ {
		appt := models.Appointment{
			Title:       "Missed appt",
			Location:    models.AppointmentLocationClinic,
			Status:      models.AppointmentStatusScheduled,
			StartAt:     now.Add(time.Duration(-60-i) * time.Minute),
			PatientID:   patient.ID,
			CreatedByID: user.ID,
		}
		if err := config.DB.Create(&appt).Error; err != nil {
			t.Fatalf("failed to seed appointment %d: %v", i, err)
		}
	}

	// Page 1 should return 15
	reqPage1 := httptest.NewRequest(http.MethodGet, "/api/admin/appointments?filter=missed&page=1", nil)
	resp1, err := app.Test(reqPage1, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp1.Body.Close()

	var payload1 adminAppointmentsResponse
	if err := json.NewDecoder(resp1.Body).Decode(&payload1); err != nil {
		t.Fatalf("decode page1: %v", err)
	}

	if len(payload1.Data) != 15 {
		t.Fatalf("expected 15 results on page 1, got %d", len(payload1.Data))
	}
	if payload1.Pagination.Total != 16 {
		t.Fatalf("expected total 16, got %d", payload1.Pagination.Total)
	}
	if payload1.Pagination.TotalPages != 2 {
		t.Fatalf("expected totalPages 2, got %d", payload1.Pagination.TotalPages)
	}

	// Page 2 should return the remaining 1
	reqPage2 := httptest.NewRequest(http.MethodGet, "/api/admin/appointments?filter=missed&page=2", nil)
	resp2, err := app.Test(reqPage2, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp2.Body.Close()

	var payload2 adminAppointmentsResponse
	if err := json.NewDecoder(resp2.Body).Decode(&payload2); err != nil {
		t.Fatalf("decode page2: %v", err)
	}

	if len(payload2.Data) != 1 {
		t.Fatalf("expected 1 result on page 2, got %d", len(payload2.Data))
	}
}

func TestGetAdminAppointments_RespectsLookbackWindow(t *testing.T) {
	app := setupAdminAppointmentsTestApp(t)
	patient, user := seedAppointmentFixtures(t)

	now := time.Now().UTC()

	withinWindow := models.Appointment{
		Title:       "Within lookback",
		Location:    models.AppointmentLocationClinic,
		Status:      models.AppointmentStatusScheduled,
		StartAt:     now.Add(-2 * 24 * time.Hour),
		PatientID:   patient.ID,
		CreatedByID: user.ID,
	}
	tooOld := models.Appointment{
		Title:       "Too old",
		Location:    models.AppointmentLocationClinic,
		Status:      models.AppointmentStatusScheduled,
		StartAt:     now.Add(-10 * 24 * time.Hour),
		PatientID:   patient.ID,
		CreatedByID: user.ID,
	}

	if err := config.DB.Create(&withinWindow).Error; err != nil {
		t.Fatalf("failed to seed within window: %v", err)
	}
	if err := config.DB.Create(&tooOld).Error; err != nil {
		t.Fatalf("failed to seed too old: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/admin/appointments?filter=missed", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}

	var payload adminAppointmentsResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if payload.Pagination.Total != 1 {
		t.Fatalf("expected only 1 appointment within lookback, got %d", payload.Pagination.Total)
	}
	if len(payload.Data) != 1 || payload.Data[0].ID != withinWindow.ID {
		t.Fatalf("expected within-window appointment only, got %+v", payload.Data)
	}
}

func TestMarkMissedLettersSent(t *testing.T) {
	app := setupAdminAppointmentsTestApp(t)
	patient, user := seedAppointmentFixtures(t)

	now := time.Now().UTC()

	appt := models.Appointment{
		Title:       "Needs letter",
		Location:    models.AppointmentLocationClinic,
		Status:      models.AppointmentStatusScheduled,
		StartAt:     now.Add(-2 * time.Hour),
		PatientID:   patient.ID,
		CreatedByID: user.ID,
	}
	if err := config.DB.Create(&appt).Error; err != nil {
		t.Fatalf("seed appointment: %v", err)
	}

	body, _ := json.Marshal(markLettersRequest{AppointmentIDs: []uint{appt.ID}})
	req := httptest.NewRequest(http.MethodPost, "/api/admin/appointments/missed-letter", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var out struct {
		Updated   int64     `json:"updated"`
		Timestamp time.Time `json:"timestamp"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Updated != 1 {
		t.Fatalf("expected 1 updated, got %d", out.Updated)
	}

	var updated models.Appointment
	if err := config.DB.First(&updated, appt.ID).Error; err != nil {
		t.Fatalf("reload: %v", err)
	}
	if updated.MissedLetterSentAt == nil {
		t.Fatalf("expected missedLetterSentAt set")
	}
}
