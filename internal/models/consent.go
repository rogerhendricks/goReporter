package models

import (
    "time"
    "github.com/rogerhendricks/goReporter/internal/config"
    "gorm.io/gorm"
)

type ConsentType string

const (
    ConsentTreatment       ConsentType = "TREATMENT"
    ConsentDataSharing     ConsentType = "DATA_SHARING"
    ConsentResearch        ConsentType = "RESEARCH"
    ConsentRemoteHomeMonitoring       ConsentType = "REMOTE_HOME_MONITORING"
    ConsentThirdParty      ConsentType = "THIRD_PARTY"
    ConsentElectronicComm  ConsentType = "ELECTRONIC_COMMUNICATION"
    ConsentPhotoVideo      ConsentType = "PHOTO_VIDEO"
)

type ConsentStatus string

const (
    ConsentGranted   ConsentStatus = "GRANTED"
    ConsentRevoked   ConsentStatus = "REVOKED"
    ConsentExpired   ConsentStatus = "EXPIRED"
)

type PatientConsent struct {
    gorm.Model
    PatientID     uint          `json:"patientId" gorm:"not null;index"`
    Patient       Patient       `json:"patient,omitempty" gorm:"foreignKey:PatientID"`
    ConsentType   ConsentType   `json:"consentType" gorm:"type:varchar(50);not null;index"`
    Status        ConsentStatus `json:"status" gorm:"type:varchar(20);not null;default:'GRANTED'"`
    GrantedDate   time.Time     `json:"grantedDate" gorm:"not null"`
    RevokedDate   *time.Time    `json:"revokedDate,omitempty"`
    ExpiryDate    *time.Time    `json:"expiryDate,omitempty"`
    GrantedBy     string        `json:"grantedBy" gorm:"type:varchar(255)"` // User ID who recorded consent
    RevokedBy     string        `json:"revokedBy,omitempty" gorm:"type:varchar(255)"`
    Notes         string        `json:"notes,omitempty" gorm:"type:text"`
    DocumentPath  string        `json:"documentPath,omitempty" gorm:"type:varchar(500)"` // Path to signed consent form
    IPAddress     string        `json:"ipAddress,omitempty" gorm:"type:varchar(50)"` // For electronic consent
    UserAgent     string        `json:"userAgent,omitempty" gorm:"type:text"` // For electronic consent
    TermsAccepted      bool          `json:"termsAccepted" gorm:"default:false"`
    TermsAcceptedAt    *time.Time    `json:"termsAcceptedAt,omitempty"`
    TermsVersion       string        `json:"termsVersion,omitempty" gorm:"type:varchar(50)"`
}

// GetPatientConsents retrieves all consents for a patient
func GetPatientConsents(patientID uint) ([]PatientConsent, error) {
    var consents []PatientConsent
    err := config.DB.Where("patient_id = ?", patientID).
        Order("granted_date DESC").
        Find(&consents).Error
    return consents, err
}

// GetActiveConsents retrieves all active (granted) consents for a patient
func GetActiveConsents(patientID uint) ([]PatientConsent, error) {
    var consents []PatientConsent
    now := time.Now()
    err := config.DB.Where("patient_id = ? AND status = ? AND (expiry_date IS NULL OR expiry_date > ?)", 
        patientID, ConsentGranted, now).
        Order("granted_date DESC").
        Find(&consents).Error
    return consents, err
}

// GetConsentByType retrieves the most recent consent of a specific type
func GetConsentByType(patientID uint, consentType ConsentType) (*PatientConsent, error) {
    var consent PatientConsent
    err := config.DB.Where("patient_id = ? AND consent_type = ?", patientID, consentType).
        Order("granted_date DESC").
        First(&consent).Error
    if err != nil {
        return nil, err
    }
    return &consent, nil
}

// HasActiveConsent checks if patient has an active consent of specific type
func HasActiveConsent(patientID uint, consentType ConsentType) (bool, error) {
    var count int64
    now := time.Now()
    err := config.DB.Model(&PatientConsent{}).
        Where("patient_id = ? AND consent_type = ? AND status = ? AND (expiry_date IS NULL OR expiry_date > ?)", 
            patientID, consentType, ConsentGranted, now).
        Count(&count).Error
    return count > 0, err
}

// CreateConsent creates a new patient consent record
func CreateConsent(consent *PatientConsent) error {
    consent.GrantedDate = time.Now()
    consent.Status = ConsentGranted
    return config.DB.Create(consent).Error
}

// RevokeConsent revokes an existing consent
func RevokeConsent(consentID uint, revokedBy string, notes string) error {
    now := time.Now()
    return config.DB.Model(&PatientConsent{}).
        Where("id = ?", consentID).
        Updates(map[string]interface{}{
            "status":      ConsentRevoked,
            "revoked_date": now,
            "revoked_by":  revokedBy,
            "notes":       notes,
        }).Error
}

// UpdateConsent updates an existing consent
func UpdateConsent(consent *PatientConsent) error {
    return config.DB.Save(consent).Error
}

// DeleteConsent deletes a consent record (soft delete)
func DeleteConsent(consentID uint) error {
    return config.DB.Delete(&PatientConsent{}, consentID).Error
}

// CheckExpiredConsents checks and updates expired consents
func CheckExpiredConsents() error {
    now := time.Now()
    return config.DB.Model(&PatientConsent{}).
        Where("status = ? AND expiry_date IS NOT NULL AND expiry_date < ?", ConsentGranted, now).
        Update("status", ConsentExpired).Error
}

// GetConsentsByDateRange retrieves consents within a date range
func GetConsentsByDateRange(startDate, endDate time.Time) ([]PatientConsent, error) {
    var consents []PatientConsent
    err := config.DB.Where("granted_date BETWEEN ? AND ?", startDate, endDate).
        Preload("Patient").
        Order("granted_date DESC").
        Find(&consents).Error
    return consents, err
}

// GetConsentStats retrieves consent statistics
func GetConsentStats() (map[string]interface{}, error) {
    var stats map[string]interface{} = make(map[string]interface{})
    
    // Total consents
    var total int64
    config.DB.Model(&PatientConsent{}).Count(&total)
    stats["total"] = total
    
    // Active consents
    var active int64
    now := time.Now()
    config.DB.Model(&PatientConsent{}).
        Where("status = ? AND (expiry_date IS NULL OR expiry_date > ?)", ConsentGranted, now).
        Count(&active)
    stats["active"] = active
    
    // Revoked consents
    var revoked int64
    config.DB.Model(&PatientConsent{}).Where("status = ?", ConsentRevoked).Count(&revoked)
    stats["revoked"] = revoked
    
    // Expired consents
    var expired int64
    config.DB.Model(&PatientConsent{}).Where("status = ?", ConsentExpired).Count(&expired)
    stats["expired"] = expired
    
    // By type
    var byType []struct {
        ConsentType ConsentType
        Count       int64
    }
    config.DB.Model(&PatientConsent{}).
        Select("consent_type, COUNT(*) as count").
        Where("status = ?", ConsentGranted).
        Group("consent_type").
        Scan(&byType)
    stats["byType"] = byType
    
    return stats, nil
}

// GetConsentByID retrieves a consent by ID
func GetConsentByID(consentID uint) (*PatientConsent, error) {
    var consent PatientConsent
    err := config.DB.First(&consent, consentID).Error
    if err != nil {
        return nil, err
    }
    return &consent, nil
}