package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"

	"gorm.io/gorm"
)

// WebhookEvent represents the types of events that can trigger webhooks
type WebhookEvent string

const (
	// Report events
	EventReportCreated   WebhookEvent = "report.created"
	EventReportCompleted WebhookEvent = "report.completed"
	EventReportReviewed  WebhookEvent = "report.reviewed"

	// Battery events
	EventBatteryLow      WebhookEvent = "battery.low"      // < 20%
	EventBatteryCritical WebhookEvent = "battery.critical" // ERI/EOL status

	// Task events
	EventTaskCreated   WebhookEvent = "task.created"
	EventTaskDue       WebhookEvent = "task.due" // Due today
	EventTaskOverdue   WebhookEvent = "task.overdue"
	EventTaskCompleted WebhookEvent = "task.completed"

	// Consent events
	EventConsentExpiring WebhookEvent = "consent.expiring" // Within 30 days
	EventConsentExpired  WebhookEvent = "consent.expired"

	// Device events
	EventDeviceImplanted WebhookEvent = "device.implanted"
	EventDeviceExplanted WebhookEvent = "device.explanted"
)

// StringArray is a custom type for storing arrays as JSON in the database
type StringArray []string

// Scan implements the sql.Scanner interface
func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to unmarshal StringArray value")
	}

	return json.Unmarshal(bytes, s)
}

// Value implements the driver.Valuer interface
func (s StringArray) Value() (driver.Value, error) {
	if len(s) == 0 {
		return "[]", nil
	}
	return json.Marshal(s)
}

// Webhook represents a webhook endpoint configuration
type Webhook struct {
	gorm.Model
	Name        string      `json:"name" gorm:"type:varchar(255);not null"`
	URL         string      `json:"url" gorm:"type:varchar(500);not null"`
	Events      StringArray `json:"events" gorm:"type:json;not null"`          // Array of WebhookEvent
	Secret      string      `json:"secret,omitempty" gorm:"type:varchar(255)"` // Optional shared secret for signature verification
	Active      bool        `json:"active" gorm:"default:true"`
	Description string      `json:"description" gorm:"type:text"`
	CreatedBy   uint        `json:"createdBy"`

	// Epic FHIR Integration
	IntegrationType string `json:"integrationType" gorm:"type:varchar(50);default:'generic'"` // generic, epic, slack, teams
	EpicClientID    string `json:"epicClientId,omitempty" gorm:"type:varchar(255)"`
	EpicPrivateKey  string `json:"epicPrivateKey,omitempty" gorm:"type:text"`       // JWT private key for Epic OAuth
	EpicTokenURL    string `json:"epicTokenUrl,omitempty" gorm:"type:varchar(500)"` // Epic OAuth token endpoint
	EpicFHIRBase    string `json:"epicFhirBase,omitempty" gorm:"type:varchar(500)"` // Epic FHIR base URL

	// Statistics
	LastTriggeredAt *string `json:"lastTriggeredAt" gorm:"type:varchar(100)"`
	SuccessCount    int     `json:"successCount" gorm:"default:0"`
	FailureCount    int     `json:"failureCount" gorm:"default:0"`
}

// WebhookDelivery represents a log of webhook delivery attempts
type WebhookDelivery struct {
	gorm.Model
	WebhookID    uint   `json:"webhookId"`
	Event        string `json:"event"`
	Payload      string `json:"payload" gorm:"type:text"`
	StatusCode   int    `json:"statusCode"`
	Response     string `json:"response" gorm:"type:text"`
	Success      bool   `json:"success"`
	ErrorMessage string `json:"errorMessage" gorm:"type:text"`
	Duration     int64  `json:"duration"` // Duration in milliseconds

	Webhook Webhook `json:"webhook" gorm:"foreignKey:WebhookID"`
}
