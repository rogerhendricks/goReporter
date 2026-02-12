package models

import (
	"errors"
	"time"

	"github.com/rogerhendricks/goReporter/internal/config"
	"gorm.io/gorm"
)

const (
	AccessRequestScopeTemporary = "temporary"
	AccessRequestScopePermanent = "permanent"

	AccessRequestStatusPending  = "pending"
	AccessRequestStatusApproved = "approved"
	AccessRequestStatusDenied   = "denied"
	AccessRequestStatusCanceled = "canceled"
)

type AccessRequest struct {
	gorm.Model

	PatientID       uint   `json:"patientId" gorm:"not null;index"`
	RequesterUserID uint   `json:"requesterUserId" gorm:"not null;index"`
	Scope           string `json:"scope" gorm:"type:varchar(20);not null;index"`
	// Only set when Scope == temporary.
	ExpiresAt *time.Time `json:"expiresAt,omitempty" gorm:"index"`
	Status    string     `json:"status" gorm:"type:varchar(20);not null;index"`
	Reason    string     `json:"reason,omitempty" gorm:"type:text"`

	ResolvedByUserID *uint      `json:"resolvedByUserId,omitempty" gorm:"index"`
	ResolvedAt       *time.Time `json:"resolvedAt,omitempty" gorm:"index"`
	ResolutionNote   string     `json:"resolutionNote,omitempty" gorm:"type:text"`

	// Relationships
	Patient       Patient `json:"patient"`
	RequesterUser User    `json:"requesterUser" gorm:"foreignKey:RequesterUserID"`
}

func (r *AccessRequest) Validate() error {
	if r.PatientID == 0 || r.RequesterUserID == 0 {
		return errors.New("missing patientId or requesterUserId")
	}
	if r.Scope != AccessRequestScopeTemporary && r.Scope != AccessRequestScopePermanent {
		return errors.New("invalid scope")
	}
	if r.Scope == AccessRequestScopeTemporary {
		if r.ExpiresAt == nil {
			return errors.New("expiresAt is required for temporary access")
		}
		if time.Now().After(*r.ExpiresAt) {
			return errors.New("expiresAt must be in the future")
		}
	} else {
		// Ensure permanent requests don't accidentally carry expiry.
		r.ExpiresAt = nil
	}
	if r.Status == "" {
		r.Status = AccessRequestStatusPending
	}
	return nil
}

func GetAccessRequestByID(id uint) (*AccessRequest, error) {
	var req AccessRequest
	err := config.DB.Preload("Patient").Preload("RequesterUser").First(&req, id).Error
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func FindPendingAccessRequest(patientID uint, requesterUserID uint, scope string) (*AccessRequest, error) {
	var req AccessRequest
	err := config.DB.
		Where("patient_id = ? AND requester_user_id = ? AND scope = ? AND status = ?", patientID, requesterUserID, scope, AccessRequestStatusPending).
		Order("created_at DESC").
		First(&req).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &req, nil
}
