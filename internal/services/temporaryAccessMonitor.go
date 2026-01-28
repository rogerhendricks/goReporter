package services

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/rogerhendricks/goReporter/internal/models"
)

// TemporaryAccessMonitor periodically scans temporary accounts and sends notifications
// ahead of expiration as well as when access has fully expired.
type TemporaryAccessMonitor struct {
	warningDays         int
	warningInterval     time.Duration
	expirationInterval  time.Duration
	warningLeadDuration time.Duration
}

// NewTemporaryAccessMonitor configures the monitor using environment overrides when available.
func NewTemporaryAccessMonitor() *TemporaryAccessMonitor {
	return &TemporaryAccessMonitor{
		warningDays:         getEnvInt("TEMPORARY_ACCESS_WARNING_DAYS", 3),
		warningInterval:     getEnvDuration("TEMPORARY_ACCESS_WARNING_INTERVAL", 30*time.Minute),
		expirationInterval:  getEnvDuration("TEMPORARY_ACCESS_EXPIRATION_INTERVAL", 5*time.Minute),
		warningLeadDuration: time.Hour * 24 * time.Duration(getEnvInt("TEMPORARY_ACCESS_WARNING_DAYS", 3)),
	}
}

// Start begins the background processors for warning and expiration checks.
func (m *TemporaryAccessMonitor) Start() {
	go m.runWarnings()
	go m.runExpirations()
}

func (m *TemporaryAccessMonitor) runWarnings() {
	m.processWarningCycle()
	ticker := time.NewTicker(m.warningInterval)
	defer ticker.Stop()

	for range ticker.C {
		m.processWarningCycle()
	}
}

func (m *TemporaryAccessMonitor) runExpirations() {
	m.processExpirationCycle()
	ticker := time.NewTicker(m.expirationInterval)
	defer ticker.Stop()

	for range ticker.C {
		m.processExpirationCycle()
	}
}

func (m *TemporaryAccessMonitor) processWarningCycle() {
	users, err := models.GetTemporaryUsersRequiringWarning(m.warningDays)
	if err != nil {
		log.Printf("[TemporaryAccessMonitor] Failed to load users requiring warning: %v", err)
		return
	}

	if len(users) == 0 {
		return
	}

	log.Printf("[TemporaryAccessMonitor] Sending warning notifications for %d temporary user(s)", len(users))

	for _, user := range users {
		if user.ExpiresAt == nil {
			continue
		}

		expiresIn := time.Until(*user.ExpiresAt).Round(time.Minute)
		expiryText := user.ExpiresAt.Format(time.RFC1123)

		NotificationsHub.BroadcastToAdmins(NotificationEvent{
			Type:     "temporary.access.warning",
			Title:    "Temporary access expiring soon",
			Message:  formatAdminWarningMessage(&user, expiresIn, expiryText),
			Severity: "warning",
		})

		NotificationsHub.SendToUser(user.ID, NotificationEvent{
			Type:     "temporary.access.warning",
			Title:    "Heads up: access ending soon",
			Message:  formatUserWarningMessage(expiresIn, expiryText),
			Severity: "warning",
		})

		if err := models.MarkTemporaryWarningSent(user.ID); err != nil {
			log.Printf("[TemporaryAccessMonitor] Failed to mark warning for user %d: %v", user.ID, err)
		}
	}
}

func (m *TemporaryAccessMonitor) processExpirationCycle() {
	users, err := models.GetTemporaryUsersExpired()
	if err != nil {
		log.Printf("[TemporaryAccessMonitor] Failed to load expired temporary users: %v", err)
		return
	}

	if len(users) == 0 {
		return
	}

	log.Printf("[TemporaryAccessMonitor] Sending expiration notifications for %d temporary user(s)", len(users))

	for _, user := range users {
		expiryText := "now"
		if user.ExpiresAt != nil {
			expiryText = user.ExpiresAt.Format(time.RFC1123)
		}

		NotificationsHub.BroadcastToAdmins(NotificationEvent{
			Type:     "temporary.access.expired",
			Title:    "Temporary access expired",
			Message:  formatAdminExpirationMessage(&user, expiryText),
			Severity: "error",
		})

		NotificationsHub.SendToUser(user.ID, NotificationEvent{
			Type:     "temporary.access.expired",
			Title:    "Access expired",
			Message:  "Your temporary access window has ended. Contact an administrator if you need more time.",
			Severity: "error",
		})

		if err := models.MarkTemporaryExpiryNoticeSent(user.ID); err != nil {
			log.Printf("[TemporaryAccessMonitor] Failed to mark expiry notice for user %d: %v", user.ID, err)
		}
	}
}

func formatAdminWarningMessage(user *models.User, expiresIn time.Duration, expiryText string) string {
	if expiresIn <= 0 {
		return formatAdminExpirationMessage(user, expiryText)
	}

	displayName := user.Username
	if user.FullName != "" {
		displayName = fmt.Sprintf("%s (%s)", user.FullName, user.Username)
	}

	return fmt.Sprintf("%s expires in %s (%s)", displayName, expiresIn.String(), expiryText)
}

func formatAdminExpirationMessage(user *models.User, expiryText string) string {
	displayName := user.Username
	if user.FullName != "" {
		displayName = fmt.Sprintf("%s (%s)", user.FullName, user.Username)
	}
	return fmt.Sprintf("%s expired at %s", displayName, expiryText)
}

func formatUserWarningMessage(expiresIn time.Duration, expiryText string) string {
	if expiresIn <= 0 {
		return "Your access window has just expired."
	}
	return fmt.Sprintf("Your temporary access ends in %s (%s).", expiresIn.String(), expiryText)
}

func getEnvInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil {
			return parsed
		}
		log.Printf("[TemporaryAccessMonitor] Invalid int for %s: %s", key, val)
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if parsed, err := time.ParseDuration(val); err == nil {
			return parsed
		}
		log.Printf("[TemporaryAccessMonitor] Invalid duration for %s: %s", key, val)
	}
	return fallback
}
