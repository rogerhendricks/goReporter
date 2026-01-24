package security

import (
	"encoding/json"
	"fmt"
	"github.com/gofiber/fiber/v2"
	"log"
	"net"
	"os"
	"strings"
	"time"
)

type EventType string

const (
	EventLogin              EventType = "LOGIN"
	EventLoginFailed        EventType = "LOGIN_FAILED"
	EventLogout             EventType = "LOGOUT"
	EventRegister           EventType = "REGISTER"
	EventPasswordChange     EventType = "PASSWORD_CHANGE"
	EventPasswordReset      EventType = "PASSWORD_RESET"
	EventTokenIssued        EventType = "TOKEN_ISSUED"
	EventTokenRefreshed     EventType = "TOKEN_REFRESHED"
	EventTokenRevoked       EventType = "TOKEN_REVOKED"
	EventAccountLocked      EventType = "ACCOUNT_LOCKED"
	EventAccountUnlocked    EventType = "ACCOUNT_UNLOCKED"
	EventUnauthorizedAccess EventType = "UNAUTHORIZED_ACCESS"
	EventDataAccess         EventType = "DATA_ACCESS"
	EventDataModification   EventType = "DATA_MODIFICATION"
	EventDataDeletion       EventType = "DATA_DELETION"
	EventFileUpload         EventType = "FILE_UPLOAD"
	EventFileDownload       EventType = "FILE_DOWNLOAD"
	EventCSRFViolation      EventType = "CSRF_VIOLATION"
	EventRateLimitExceeded  EventType = "RATE_LIMIT_EXCEEDED"
	EventSuspiciousActivity EventType = "SUSPICIOUS_ACTIVITY"
)

type SecurityEvent struct {
	Timestamp  time.Time              `json:"timestamp"`
	EventType  EventType              `json:"eventType"`
	UserID     string                 `json:"userId,omitempty"`
	Username   string                 `json:"username,omitempty"`
	IPAddress  string                 `json:"ipAddress"`
	UserAgent  string                 `json:"userAgent,omitempty"`
	Path       string                 `json:"path"`
	Method     string                 `json:"method"`
	StatusCode int                    `json:"statusCode,omitempty"`
	Message    string                 `json:"message"`
	Severity   string                 `json:"severity"` // INFO, WARNING, CRITICAL
	Details    map[string]interface{} `json:"details,omitempty"`
	DeviceInfo map[string]string      `json:"deviceInfo,omitempty"`
}

type SecurityLogger struct {
	logFile *os.File
}

var globalLogger *SecurityLogger

// InitSecurityLogger initializes the security logger
func InitSecurityLogger() error {
	logDir := "logs"
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return fmt.Errorf("failed to create logs directory: %w", err)
	}

	filename := fmt.Sprintf("%s/security_%s.log", logDir, time.Now().Format("2006-01-02"))
	file, err := os.OpenFile(filename, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	globalLogger = &SecurityLogger{
		logFile: file,
	}

	return nil
}

// LogEvent logs a security event
func LogEvent(event SecurityEvent) {
	if globalLogger == nil {
		log.Println("Security logger not initialized")
		return
	}

	event.Timestamp = time.Now()

	jsonData, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error marshaling security event: %v", err)
		return
	}

	if _, err := globalLogger.logFile.WriteString(string(jsonData) + "\n"); err != nil {
		log.Printf("Error writing security log: %v", err)
	}

	// Also log to standard logger for immediate visibility
	log.Printf("[SECURITY] %s | %s | User: %s | IP: %s | %s",
		event.Severity, event.EventType, event.UserID, event.IPAddress, event.Message)
}

// IsPrivateIP checks if an IP is private/internal
func IsPrivateIP(ip string) bool {
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return false
	}

	privateBlocks := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.0/8",
		"::1/128",
		"fc00::/7",
	}

	for _, block := range privateBlocks {
		_, subnet, _ := net.ParseCIDR(block)
		if subnet.Contains(parsedIP) {
			return true
		}
	}

	return false
}

// GetRealIP extracts the real client IP from proxy headers
func GetRealIP(c *fiber.Ctx) string {
	// Check X-Real-IP header (set by nginx/caddy)
	if ip := c.Get("X-Real-IP"); ip != "" {
		if !IsPrivateIP(ip) {
			return ip
		}
	}

	// Check X-Forwarded-For header (standard proxy header)
	if xff := c.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		// Find the first non-private IP
		for _, ip := range ips {
			ip = strings.TrimSpace(ip)
			if !IsPrivateIP(ip) {
				return ip
			}
		}
	}

	// Check CF-Connecting-IP (Cloudflare)
	if ip := c.Get("CF-Connecting-IP"); ip != "" {
		return ip
	}

	// Check True-Client-IP (Akamai and Cloudflare)
	if ip := c.Get("True-Client-IP"); ip != "" {
		return ip
	}

	// Fallback to Fiber's IP() method
	return c.IP()
}

// Helper function to log from Fiber context
func LogEventFromContext(c *fiber.Ctx, eventType EventType, message string, severity string, details map[string]interface{}) {
	userID := ""
	username := ""

	// Extract userID from locals (set by AuthenticateJWT middleware)
	if uid := c.Locals("userID"); uid != nil {
		if uidStr, ok := uid.(string); ok {
			userID = uidStr
		}
	}

	// Extract username from locals (set by AuthenticateJWT middleware)
	if uname := c.Locals("username"); uname != nil {
		if unameStr, ok := uname.(string); ok {
			username = unameStr
		}
	}
	event := SecurityEvent{
		EventType:  eventType,
		UserID:     userID,
		Username:   username,
		IPAddress:  GetRealIP(c),
		UserAgent:  c.Get("User-Agent"),
		Path:       c.Path(),
		Method:     c.Method(),
		StatusCode: c.Response().StatusCode(),
		Message:    message,
		Severity:   severity,
		Details:    details,
		DeviceInfo: map[string]string{
			"fingerprint": c.Get("X-Device-Fingerprint"),
		},
	}

	LogEvent(event)
}

// LogEventWithUser logs a security event with explicit user information
func LogEventWithUser(c *fiber.Ctx, eventType EventType, message string, severity string, userID string, username string, details map[string]interface{}) {
	event := SecurityEvent{
		EventType:  eventType,
		UserID:     userID,
		Username:   username,
		IPAddress:  GetRealIP(c),
		UserAgent:  c.Get("User-Agent"),
		Path:       c.Path(),
		Method:     c.Method(),
		StatusCode: c.Response().StatusCode(),
		Message:    message,
		Severity:   severity,
		Details:    details,
		DeviceInfo: map[string]string{
			"fingerprint": c.Get("X-Device-Fingerprint"),
		},
	}

	LogEvent(event)
}

// Close closes the log file
func Close() {
	if globalLogger != nil && globalLogger.logFile != nil {
		globalLogger.logFile.Close()
	}
}
