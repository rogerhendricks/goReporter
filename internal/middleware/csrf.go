package middleware

import (
	"crypto/rand"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/security"
)

// CSRFStore holds CSRF tokens (in production, use Redis or similar)
// var csrfTokens = make(map[string]time.Time)

// GenerateCSRFToken generates a random CSRF token
func GenerateCSRFToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return fmt.Sprintf("%x", b)
}

// ValidateCSRF validates CSRF token from header against cookie
func ValidateCSRF(c *fiber.Ctx) error {
	// Skip validation for safe methods
	if c.Method() == "GET" || c.Method() == "HEAD" || c.Method() == "OPTIONS" {
		return c.Next()
	}

	// Skip validation for auth endpoints
	if c.Path() == "/api/auth/login" ||
		c.Path() == "/api/auth/register" ||
		c.Path() == "/api/auth/refresh-token" {
		return c.Next()
	}

	// Get token from cookie
	cookieToken := c.Cookies("csrf_token")
	if cookieToken == "" {
		security.LogEventFromContext(c, security.EventCSRFViolation,
			"No CSRF token in cookie",
			"CRITICAL",
			nil)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "No CSRF token found in cookie",
		})
	}

	// Get token from header
	headerToken := c.Get("X-CSRF-Token")
	if headerToken == "" {
		security.LogEventFromContext(c, security.EventCSRFViolation,
			"No CSRF token in header",
			"CRITICAL",
			nil)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "No CSRF token found in header",
		})
	}

	// Compare tokens
	if cookieToken != headerToken {
		security.LogEventFromContext(c, security.EventCSRFViolation,
			"CSRF token mismatch",
			"CRITICAL",
			map[string]interface{}{
				"expectedMatch": false,
			})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "CSRF token mismatch",
		})
	}

	// Check token expiration (optional, based on cookie MaxAge)
	return c.Next()
}

// SetCSRFCookie sets a CSRF token cookie
func SetCSRFCookie(c *fiber.Ctx, token string) {
	sameSite := normalizeSameSite(os.Getenv("COOKIE_SAMESITE"))
	secure := shouldUseSecureCookies(c)
	if sameSite == "None" && !secure {
		secure = true
	}

	c.Cookie(&fiber.Cookie{
		Name:     "csrf_token",
		Value:    token,
		HTTPOnly: false, // Must be false so JavaScript can read it
		Secure:   secure,
		SameSite: sameSite,
		Domain:   strings.TrimSpace(os.Getenv("COOKIE_DOMAIN")),
		MaxAge:   int((1 * time.Hour).Seconds()),
		Path:     "/",
	})
}

func shouldUseSecureCookies(c *fiber.Ctx) bool {
	if value, exists := os.LookupEnv("COOKIE_SECURE"); exists {
		if parsed, err := strconv.ParseBool(strings.TrimSpace(value)); err == nil {
			return parsed
		}
	}

	appEnv := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
	if appEnv == "production" {
		return true
	}

	if strings.EqualFold(c.Protocol(), "https") {
		return true
	}

	forwardedProto := strings.ToLower(strings.TrimSpace(c.Get("X-Forwarded-Proto")))
	return strings.Contains(forwardedProto, "https")
}

func normalizeSameSite(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "none":
		return "None"
	case "strict":
		return "Strict"
	case "lax", "":
		return "Lax"
	default:
		return "Lax"
	}
}
