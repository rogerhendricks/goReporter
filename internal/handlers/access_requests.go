package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/rogerhendricks/goReporter/internal/services"
	"gorm.io/gorm"
)

type AccessRequestPatientLookupResponse struct {
	ID    uint   `json:"id"`
	MRN   int    `json:"mrn"`
	Fname string `json:"fname"`
	Lname string `json:"lname"`
	DOB   string `json:"dob"`
}

type CreateAccessRequestInput struct {
	PatientID uint       `json:"patientId"`
	Scope     string     `json:"scope"`
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
	Reason    string     `json:"reason,omitempty"`
}

type AccessRequestUserSummary struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	FullName string `json:"fullName,omitempty"`
	Role     string `json:"role"`
	DoctorID *uint  `json:"doctorId,omitempty"`
}

type AccessRequestPatientSummary struct {
	ID    uint   `json:"id"`
	MRN   int    `json:"mrn"`
	Fname string `json:"fname"`
	Lname string `json:"lname"`
	DOB   string `json:"dob,omitempty"`
}

type AccessRequestResponse struct {
	ID               uint                        `json:"id"`
	PatientID        uint                        `json:"patientId"`
	RequesterUserID  uint                        `json:"requesterUserId"`
	Scope            string                      `json:"scope"`
	ExpiresAt        *time.Time                  `json:"expiresAt,omitempty"`
	Status           string                      `json:"status"`
	Reason           string                      `json:"reason,omitempty"`
	ResolvedByUserID *uint                       `json:"resolvedByUserId,omitempty"`
	ResolvedAt       *time.Time                  `json:"resolvedAt,omitempty"`
	ResolutionNote   string                      `json:"resolutionNote,omitempty"`
	CreatedAt        time.Time                   `json:"createdAt"`
	UpdatedAt        time.Time                   `json:"updatedAt"`
	Patient          AccessRequestPatientSummary `json:"patient"`
	RequesterUser    AccessRequestUserSummary    `json:"requesterUser"`
}

type ResolveAccessRequestInput struct {
	ExpiresAt      *time.Time `json:"expiresAt,omitempty"`
	ResolutionNote string     `json:"resolutionNote,omitempty"`
}

func getUintParam(c *fiber.Ctx, name string) (uint, error) {
	val := c.Params(name)
	if val == "" {
		return 0, errors.New("missing param")
	}
	parsed, err := strconv.ParseUint(val, 10, 32)
	if err != nil {
		return 0, err
	}
	return uint(parsed), nil
}

func safeUserID(c *fiber.Ctx) uint {
	if v := c.Locals("user_id"); v != nil {
		if id, ok := v.(uint); ok {
			return id
		}
	}
	// Fallback for older handlers
	if v := c.Locals("userID"); v != nil {
		if s, ok := v.(string); ok {
			if parsed, err := strconv.ParseUint(s, 10, 32); err == nil {
				return uint(parsed)
			}
		}
	}
	return 0
}

func toAccessRequestResponse(req models.AccessRequest) AccessRequestResponse {
	resp := AccessRequestResponse{
		ID:               req.ID,
		PatientID:        req.PatientID,
		RequesterUserID:  req.RequesterUserID,
		Scope:            req.Scope,
		ExpiresAt:        req.ExpiresAt,
		Status:           req.Status,
		Reason:           req.Reason,
		ResolvedByUserID: req.ResolvedByUserID,
		ResolvedAt:       req.ResolvedAt,
		ResolutionNote:   req.ResolutionNote,
		CreatedAt:        req.CreatedAt,
		UpdatedAt:        req.UpdatedAt,
		Patient: AccessRequestPatientSummary{
			ID:    req.Patient.ID,
			MRN:   req.Patient.MRN,
			Fname: req.Patient.FirstName,
			Lname: req.Patient.LastName,
			DOB:   req.Patient.DOB,
		},
		RequesterUser: AccessRequestUserSummary{
			ID:       req.RequesterUser.ID,
			Username: req.RequesterUser.Username,
			FullName: req.RequesterUser.FullName,
			Role:     req.RequesterUser.Role,
			DoctorID: req.RequesterUser.DoctorID,
		},
	}
	return resp
}

func CreateAccessRequest(c *fiber.Ctx) error {
	requesterID := safeUserID(c)
	if requesterID == 0 {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Authentication required"})
	}

	var input CreateAccessRequestInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate requester is linked to a Doctor profile
	var doctor models.Doctor
	if err := config.DB.Where("user_id = ?", requesterID).First(&doctor).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Doctor profile not found for current user"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load doctor profile"})
	}

	// Ensure patient exists
	var patient models.Patient
	if err := config.DB.Select("id", "mrn", "first_name", "last_name", "dob").First(&patient, input.PatientID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Patient not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load patient"})
	}

	// Prevent duplicates: return existing pending request if present
	if existing, err := models.FindPendingAccessRequest(input.PatientID, requesterID, input.Scope); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check existing requests"})
	} else if existing != nil {
		// Load relationships for consistent response
		_ = config.DB.Preload("Patient").Preload("RequesterUser").First(existing, existing.ID).Error
		return c.JSON(toAccessRequestResponse(*existing))
	}

	req := models.AccessRequest{
		PatientID:       input.PatientID,
		RequesterUserID: requesterID,
		Scope:           input.Scope,
		ExpiresAt:       input.ExpiresAt,
		Status:          models.AccessRequestStatusPending,
		Reason:          input.Reason,
	}
	if err := req.Validate(); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := config.DB.Create(&req).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create access request"})
	}
	_ = config.DB.Preload("Patient").Preload("RequesterUser").First(&req, req.ID).Error

	// Notify admins with direct link to request detail
	adminEvt := services.NotificationEvent{
		Type:            "access_request_created",
		Title:           "Patient access request",
		Message:         fmt.Sprintf("%s requested %s access to %s %s (MRN %d).", doctor.FullName, req.Scope, patient.FirstName, patient.LastName, patient.MRN),
		Severity:        "info",
		ActionURL:       fmt.Sprintf("/admin/access-requests/%d", req.ID),
		AccessRequestID: &req.ID,
	}
	services.NotificationsHub.BroadcastToAdmins(adminEvt)

	return c.Status(http.StatusCreated).JSON(toAccessRequestResponse(req))
}

// Doctor utility: lookup patient by exact MRN to initiate an access request
func LookupPatientForAccessRequest(c *fiber.Ctx) error {
	mrnStr := c.Query("mrn")
	if mrnStr == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "mrn query param is required"})
	}
	mrn, err := strconv.Atoi(mrnStr)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid MRN"})
	}

	var patient models.Patient
	if err := config.DB.Select("id", "mrn", "first_name", "last_name", "dob").Where("mrn = ?", mrn).First(&patient).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Patient not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to lookup patient"})
	}

	return c.JSON(AccessRequestPatientLookupResponse{
		ID:    patient.ID,
		MRN:   patient.MRN,
		Fname: patient.FirstName,
		Lname: patient.LastName,
		DOB:   patient.DOB,
	})
}

func GetMyAccessRequests(c *fiber.Ctx) error {
	requesterID := safeUserID(c)
	if requesterID == 0 {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Authentication required"})
	}

	var reqs []models.AccessRequest
	err := config.DB.
		Preload("Patient").
		Preload("RequesterUser").
		Where("requester_user_id = ?", requesterID).
		Order("created_at DESC").
		Limit(50).
		Find(&reqs).Error
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load access requests"})
	}

	resp := make([]AccessRequestResponse, 0, len(reqs))
	for _, r := range reqs {
		resp = append(resp, toAccessRequestResponse(r))
	}
	return c.JSON(resp)
}

func GetAccessRequest(c *fiber.Ctx) error {
	requesterID := safeUserID(c)
	if requesterID == 0 {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Authentication required"})
	}

	requestID, err := getUintParam(c, "id")
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request ID"})
	}

	req, err := models.GetAccessRequestByID(requestID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Request not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load request"})
	}

	role, _ := c.Locals("userRole").(string)
	if role != "admin" && req.RequesterUserID != requesterID {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	return c.JSON(toAccessRequestResponse(*req))
}

func AdminListAccessRequests(c *fiber.Ctx) error {
	scope := c.Query("scope")
	status := c.Query("status")

	query := config.DB.Preload("Patient").Preload("RequesterUser").Model(&models.AccessRequest{})
	if scope != "" && scope != "all" {
		query = query.Where("scope = ?", scope)
	}
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	var reqs []models.AccessRequest
	if err := query.Order("created_at DESC").Limit(200).Find(&reqs).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load access requests"})
	}
	resp := make([]AccessRequestResponse, 0, len(reqs))
	for _, r := range reqs {
		resp = append(resp, toAccessRequestResponse(r))
	}
	return c.JSON(resp)
}

func AdminGetAccessRequest(c *fiber.Ctx) error {
	requestID, err := getUintParam(c, "id")
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request ID"})
	}

	req, err := models.GetAccessRequestByID(requestID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Request not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load request"})
	}
	return c.JSON(toAccessRequestResponse(*req))
}

func AdminApproveAccessRequest(c *fiber.Ctx) error {
	adminID := safeUserID(c)
	if adminID == 0 {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Authentication required"})
	}

	requestID, err := getUintParam(c, "id")
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request ID"})
	}

	var input ResolveAccessRequestInput
	_ = c.BodyParser(&input)

	var approvedReq models.AccessRequest
	var patient models.Patient
	var doctor models.Doctor

	txErr := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Preload("Patient").Preload("RequesterUser").First(&approvedReq, requestID).Error; err != nil {
			return err
		}
		if approvedReq.Status != models.AccessRequestStatusPending {
			return fmt.Errorf("request is already %s", approvedReq.Status)
		}

		// Validate scope expiry
		var expiresAt *time.Time
		if approvedReq.Scope == models.AccessRequestScopeTemporary {
			expiresAt = approvedReq.ExpiresAt
			if input.ExpiresAt != nil {
				expiresAt = input.ExpiresAt
			}
			if expiresAt == nil {
				return errors.New("expiresAt is required for temporary approvals")
			}
			if time.Now().After(*expiresAt) {
				return errors.New("expiresAt must be in the future")
			}
		}

		now := time.Now()
		approvedReq.Status = models.AccessRequestStatusApproved
		approvedReq.ResolvedByUserID = &adminID
		approvedReq.ResolvedAt = &now
		approvedReq.ResolutionNote = input.ResolutionNote
		if approvedReq.Scope == models.AccessRequestScopeTemporary {
			approvedReq.ExpiresAt = expiresAt
		}

		if err := tx.Save(&approvedReq).Error; err != nil {
			return err
		}

		// Load patient (minimal)
		if err := tx.Select("id", "mrn", "first_name", "last_name").First(&patient, approvedReq.PatientID).Error; err != nil {
			return err
		}

		// Resolve doctor profile for requester
		if err := tx.Where("user_id = ?", approvedReq.RequesterUserID).First(&doctor).Error; err != nil {
			return err
		}

		// Create or update patient link
		var link models.PatientDoctor
		linkErr := tx.Where("patient_id = ? AND doctor_id = ?", approvedReq.PatientID, doctor.ID).First(&link).Error
		if errors.Is(linkErr, gorm.ErrRecordNotFound) {
			link = models.PatientDoctor{
				PatientID: approvedReq.PatientID,
				DoctorID:  doctor.ID,
				IsPrimary: false,
			}
		}

		// Only adjust expiry when the existing link isn't already permanent
		if approvedReq.Scope == models.AccessRequestScopePermanent {
			link.AccessExpiresAt = nil
		} else {
			if link.AccessExpiresAt != nil {
				link.AccessExpiresAt = approvedReq.ExpiresAt
			} else {
				// link is already permanent; keep permanent
			}
			if link.AccessExpiresAt == nil {
				// If no existing link, or it was temporary, set temporary expiry
				if link.ID == 0 {
					link.AccessExpiresAt = approvedReq.ExpiresAt
				}
			}
		}
		if link.GrantedByAccessRequestID == nil {
			link.GrantedByAccessRequestID = &approvedReq.ID
		}

		if link.ID == 0 {
			return tx.Create(&link).Error
		}
		return tx.Save(&link).Error
	})

	if txErr != nil {
		if errors.Is(txErr, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Request not found"})
		}
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": txErr.Error()})
	}

	// Notify the requester doctor
	docEvt := services.NotificationEvent{
		Type:            "access_request_approved",
		Title:           "Access request approved",
		Message:         fmt.Sprintf("You now have %s access to %s %s.", approvedReq.Scope, patient.FirstName, patient.LastName),
		Severity:        "success",
		ActionURL:       fmt.Sprintf("/access-requests/%d", approvedReq.ID),
		AccessRequestID: &approvedReq.ID,
	}
	services.NotificationsHub.SendToUser(approvedReq.RequesterUserID, docEvt)

	// Notify admins (optional, helps multi-admin workflows)
	adminEvt := services.NotificationEvent{
		Type:            "access_request_resolved",
		Title:           "Access request approved",
		Message:         fmt.Sprintf("Approved %s access for %s to %s %s.", approvedReq.Scope, doctor.FullName, patient.FirstName, patient.LastName),
		Severity:        "success",
		ActionURL:       fmt.Sprintf("/admin/access-requests/%d", approvedReq.ID),
		AccessRequestID: &approvedReq.ID,
	}
	services.NotificationsHub.BroadcastToAdmins(adminEvt)

	return c.JSON(toAccessRequestResponse(approvedReq))
}

func AdminDenyAccessRequest(c *fiber.Ctx) error {
	adminID := safeUserID(c)
	if adminID == 0 {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Authentication required"})
	}

	requestID, err := getUintParam(c, "id")
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request ID"})
	}

	var input ResolveAccessRequestInput
	_ = c.BodyParser(&input)

	var deniedReq models.AccessRequest
	var patient models.Patient
	var doctor models.Doctor

	txErr := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Preload("Patient").Preload("RequesterUser").First(&deniedReq, requestID).Error; err != nil {
			return err
		}
		if deniedReq.Status != models.AccessRequestStatusPending {
			return fmt.Errorf("request is already %s", deniedReq.Status)
		}

		now := time.Now()
		deniedReq.Status = models.AccessRequestStatusDenied
		deniedReq.ResolvedByUserID = &adminID
		deniedReq.ResolvedAt = &now
		deniedReq.ResolutionNote = input.ResolutionNote
		if err := tx.Save(&deniedReq).Error; err != nil {
			return err
		}

		if err := tx.Select("id", "first_name", "last_name").First(&patient, deniedReq.PatientID).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ?", deniedReq.RequesterUserID).First(&doctor).Error; err != nil {
			// Not fatal for denial
			return nil
		}
		return nil
	})

	if txErr != nil {
		if errors.Is(txErr, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Request not found"})
		}
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": txErr.Error()})
	}

	// Notify the requester doctor
	docEvt := services.NotificationEvent{
		Type:            "access_request_denied",
		Title:           "Access request denied",
		Message:         fmt.Sprintf("Your access request for %s %s was denied.", patient.FirstName, patient.LastName),
		Severity:        "error",
		ActionURL:       fmt.Sprintf("/access-requests/%d", deniedReq.ID),
		AccessRequestID: &deniedReq.ID,
	}
	services.NotificationsHub.SendToUser(deniedReq.RequesterUserID, docEvt)

	adminEvt := services.NotificationEvent{
		Type:            "access_request_resolved",
		Title:           "Access request denied",
		Message:         fmt.Sprintf("Denied %s access for %s to %s %s.", deniedReq.Scope, doctor.FullName, patient.FirstName, patient.LastName),
		Severity:        "warning",
		ActionURL:       fmt.Sprintf("/admin/access-requests/%d", deniedReq.ID),
		AccessRequestID: &deniedReq.ID,
	}
	services.NotificationsHub.BroadcastToAdmins(adminEvt)

	return c.JSON(toAccessRequestResponse(deniedReq))
}
