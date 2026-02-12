package validation

import (
	"errors"
	"strings"
	"time"

	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/rogerhendricks/goReporter/internal/utils"
)

// ValidateUserUpdate validates user update data with enhanced checks
func ValidateUserUpdate(user *models.User, isAdmin bool) error {
	if user.Username != "" {
		username := strings.TrimSpace(user.Username)
		if len(username) < 3 || len(username) > 50 {
			return errors.New("username must be between 3 and 50 characters")
		}
		if !IsValidUsername(username) {
			return errors.New("username contains invalid characters")
		}
	}

	if user.Email != "" {
		email := strings.TrimSpace(user.Email)
		if !utils.IsValidEmail(email) {
			return errors.New("invalid email format")
		}
		if len(email) > 255 {
			return errors.New("email must be less than 255 characters")
		}
	}

	if user.FullName != "" {
		fullName := strings.TrimSpace(user.FullName)
		if len(fullName) < 3 || len(fullName) > 100 {
			return errors.New("full name must be between 3 and 100 characters")
		}
	}

	if user.Role != "" && !isAdmin {
		return errors.New("insufficient permissions to change role")
	}

	if user.Role != "" && !utils.IsValidRole(user.Role) {
		return errors.New("invalid role")
	}

	if user.IsTemporary {
		if user.ExpiresAt == nil {
			return errors.New("temporary users must include an expiration date")
		}
		if time.Until(*user.ExpiresAt) <= 0 {
			return errors.New("temporary user expiration must be in the future")
		}
	}

	// Validate password if provided (admin only updates) - use new complexity validation
	if user.Password != "" {
		if err := utils.ValidatePasswordComplexity(user.Password); err != nil {
			return err
		}
	}
	return nil
}

// IsValidUsername checks if username contains only allowed characters
func IsValidUsername(username string) bool {
	for _, char := range username {
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '_' || char == '-') {
			return false
		}
	}
	return true
}
