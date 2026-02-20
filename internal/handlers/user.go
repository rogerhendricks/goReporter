package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/rogerhendricks/goReporter/internal/utils"
	"github.com/rogerhendricks/goReporter/internal/validation"

	"errors" // Added errors import
	"html"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Payloads dedicated to user management to avoid leaking unintended fields
// and to capture optional temporary-access metadata cleanly.
type userCreateRequest struct {
	Username    string     `json:"username"`
	Email       string     `json:"email"`
	FullName    string     `json:"fullName"`
	Role        string     `json:"role"`
	Password    string     `json:"password"`
	IsTemporary *bool      `json:"isTemporary"`
	ExpiresAt   *time.Time `json:"expiresAt"`
}

type userUpdateRequest struct {
	Username    *string    `json:"username"`
	Email       *string    `json:"email"`
	FullName    *string    `json:"fullName"`
	Role        *string    `json:"role"`
	Password    *string    `json:"password"`
	DoctorID    *uint      `json:"doctorId"`
	IsTemporary *bool      `json:"isTemporary"`
	ExpiresAt   *time.Time `json:"expiresAt"`
}

// CreateUser creates a new user
func CreateUser(c *fiber.Ctx) error {
	authenticatedUserID, ok := c.Locals("userID").(string)
	if !ok || authenticatedUserID == "" {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid session"})
	}

	requester, err := models.GetUserByID(authenticatedUserID)
	if err != nil || requester.Role != "admin" {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
	}

	var payload userCreateRequest
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
	}

	role := strings.TrimSpace(payload.Role)
	if role == "" {
		role = "user"
	}

	isTemporary := payload.IsTemporary != nil && *payload.IsTemporary

	newUser := models.User{
		Username:    strings.TrimSpace(payload.Username),
		Email:       strings.TrimSpace(payload.Email),
		FullName:    strings.TrimSpace(payload.FullName),
		Role:        role,
		IsTemporary: isTemporary,
	}

	if newUser.IsTemporary {
		newUser.Role = "viewer"

		if payload.ExpiresAt == nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Temporary users must include an expiration date"})
		}

		expiresAt := *payload.ExpiresAt
		newUser.ExpiresAt = &expiresAt
	} else {
		newUser.ExpiresAt = nil
	}

	if newUser.Role == "doctor" && newUser.IsTemporary {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Temporary users cannot be doctors"})
	}

	if newUser.IsTemporary && newUser.DoctorID != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Temporary users cannot be linked to doctor records"})
	}

	if err := validation.ValidateUserUpdate(&newUser, true); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	newUser.Username = html.EscapeString(newUser.Username)
	newUser.Email = html.EscapeString(newUser.Email)
	newUser.FullName = html.EscapeString(newUser.FullName)

	hashedPassword, err := models.HashPassword(payload.Password)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}
	newUser.Password = hashedPassword

	// Create user in the database
	if err := models.CreateUser(&newUser); err != nil {
		log.Printf("Error creating user: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
	}

	if newUser.IsTemporary {
		newUser.Role = "viewer"
	}

	// If the user is a doctor, create a corresponding doctor record
	if newUser.Role == "doctor" {
		// Use Username if FullName is empty
		doctorFullName := newUser.FullName
		if doctorFullName == "" {
			doctorFullName = newUser.Username
		}

		newDoctor := models.Doctor{
			UserID:   &newUser.ID,
			FullName: doctorFullName,
			Email:    newUser.Email,
		}
		if err := models.CreateDoctor(&newDoctor); err != nil {
			log.Printf("Failed to create doctor record for user %d: %v", newUser.ID, err)
			// Optional: You might want to delete the created user if doctor creation fails
			// models.DeleteUser(fmt.Sprint(newUser.ID))
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create doctor record"})
		}
		// Link the user to the doctor record
		newUser.DoctorID = &newDoctor.ID
		if err := models.UpdateUser(&newUser); err != nil {
			log.Printf("Failed to link user %d to doctor record %d: %v", newUser.ID, newDoctor.ID, err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to link user to doctor record"})
		}
	}

	// Remove sensitive data before returning
	newUser.Password = ""
	return c.Status(http.StatusCreated).JSON(newUser)
}

// GetUserProfile retrieves the user profile information
func GetUserProfile(c *fiber.Ctx) error {
	userID := c.Params("id")

	// Single UUID validation (removed duplicate)
	if _, err := uuid.Parse(userID); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID format"})
	}

	// Authorization check - users can only access their own profile or admin can access any
	authenticatedUserID := c.Locals("userID").(string)
	if userID != authenticatedUserID {
		// Check if user has admin role
		authenticatedUser, err := models.GetUserByID(authenticatedUserID)
		if err != nil || authenticatedUser.Role != "admin" {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
		}
	}

	user, err := models.GetUserByID(userID)
	if err != nil {
		// Log the actual error but don't expose it
		log.Printf("Error fetching user %s: %v", userID, err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
	}

	// Remove sensitive data before returning
	user.Password = ""
	return c.JSON(user)
}

func GetUsers(c *fiber.Ctx) error {
	users, err := models.GetAllUsers()
	if err != nil {
		log.Printf("Error fetching all users: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve users"})
	}

	// Sanitize passwords before sending
	for i := range users {
		users[i].Password = ""
	}

	return c.JSON(users)
}

// UpdateUser updates a user by ID (admin-only or self-update with restrictions)
func UpdateUser(c *fiber.Ctx) error {
	userIDParam := c.Params("id")

	// Convert string ID to uint (since GORM uses uint for primary keys)
	userID, err := strconv.ParseUint(userIDParam, 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID format"})
	}

	// Authorization check - users can only update their own profile or admin can update any
	authenticatedUserID := c.Locals("userID").(string)
	isAdmin := false

	// Convert authenticated user ID for comparison
	authUserID, err := strconv.ParseUint(authenticatedUserID, 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid authenticated user ID"})
	}

	if uint(userID) != uint(authUserID) {
		authenticatedUser, err := models.GetUserByID(authenticatedUserID)
		if err != nil || authenticatedUser.Role != "admin" {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
		}
		isAdmin = true
	}

	var payload userUpdateRequest
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
	}

	// Load the user that is being updated
	existingUser, err := models.GetUserByID(userIDParam)
	if err != nil {
		log.Printf("Error fetching user %s: %v", userIDParam, err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
	}

	oldRole := existingUser.Role
	originalIsTemporary := existingUser.IsTemporary

	// Non-admins are not allowed to manipulate privileged fields
	if !isAdmin {
		if payload.Role != nil || payload.Password != nil || payload.DoctorID != nil ||
			payload.IsTemporary != nil || payload.ExpiresAt != nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
		}
	}

	// Build a proposed user state to validate and then apply
	proposed := *existingUser
	proposed.Password = ""

	if payload.Username != nil {
		proposed.Username = strings.TrimSpace(*payload.Username)
	}
	if payload.Email != nil {
		proposed.Email = strings.TrimSpace(*payload.Email)
	}
	if payload.FullName != nil {
		proposed.FullName = strings.TrimSpace(*payload.FullName)
	}
	if payload.Role != nil {
		nextRole := strings.TrimSpace(*payload.Role)
		if proposed.IsTemporary && nextRole != "viewer" {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Temporary users must use the viewer role"})
		}
		proposed.Role = nextRole
	}
	if payload.Password != nil {
		proposed.Password = *payload.Password
	}
	if payload.IsTemporary != nil {
		proposed.IsTemporary = *payload.IsTemporary
		if proposed.IsTemporary {
			proposed.Role = "viewer"
		}
	}

	if proposed.IsTemporary {
		if payload.ExpiresAt == nil && existingUser.ExpiresAt == nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Temporary users must include an expiration date"})
		}
		if payload.ExpiresAt != nil {
			proposed.ExpiresAt = payload.ExpiresAt
		}
	} else {
		proposed.ExpiresAt = nil
	}

	if payload.ExpiresAt != nil && !proposed.IsTemporary {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Expiration dates are only valid for temporary users"})
	}

	if err := validation.ValidateUserUpdate(&proposed, isAdmin); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Check for username uniqueness if updating username
	if payload.Username != nil {
		newUsername := proposed.Username
		if newUsername != existingUser.Username {
			existingUserByUsername, err := models.GetUserByUsername(newUsername)
			if err == nil && existingUserByUsername.ID != existingUser.ID {
				return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Username already exists"})
			}
		}
		existingUser.Username = html.EscapeString(newUsername)
	}

	// Check for email uniqueness if updating email
	if payload.Email != nil {
		newEmail := proposed.Email
		if newEmail != existingUser.Email {
			existingUserByEmail, err := models.GetUserByEmail(newEmail)
			if err == nil && existingUserByEmail.ID != existingUser.ID {
				return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Email already exists"})
			}
		}
		existingUser.Email = html.EscapeString(newEmail)
	}

	if payload.FullName != nil {
		newFullName := proposed.FullName
		if newFullName != existingUser.FullName {
			existingUserByFullName, err := models.GetUserByFullName(newFullName)
			if err == nil && existingUserByFullName.ID != existingUser.ID {
				return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Full name already exists"})
			}
		}
		existingUser.FullName = html.EscapeString(newFullName)
	}

	// Only admin can change roles (temporary users are always viewers)
	if isAdmin && payload.Role != nil {
		if proposed.IsTemporary && proposed.Role != "viewer" {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Temporary users must use the viewer role"})
		}
		newRole := proposed.Role
		existingUser.Role = html.EscapeString(newRole)
	}

	// Handle password updates (admin only through this endpoint)
	if isAdmin && payload.Password != nil {
		hashedPassword, err := models.HashPassword(proposed.Password)
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		existingUser.Password = hashedPassword
	}

	// Handle doctor ID updates (admin only)
	if isAdmin && payload.DoctorID != nil {
		if proposed.IsTemporary {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Temporary users cannot be linked to doctor records"})
		}
		existingUser.DoctorID = payload.DoctorID
	}

	// Apply the proposed temporary state and enforce viewer role if needed
	existingUser.IsTemporary = proposed.IsTemporary
	if existingUser.IsTemporary {
		existingUser.Role = "viewer"
		existingUser.ExpiresAt = proposed.ExpiresAt
		existingUser.DoctorID = nil
	} else {
		existingUser.ExpiresAt = nil
		if originalIsTemporary {
			existingUser.LastTemporaryWarningAt = nil
			existingUser.LastTemporaryExpiryNoticeAt = nil
		}
	}

	// Update user in the database
	if err := models.UpdateUser(existingUser); err != nil {
		log.Printf("Error updating user %s: %v", userIDParam, err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update user"})
	}

	// If role changed to 'doctor' and user doesn't have a doctor record, create one
	if isAdmin && existingUser.Role == "doctor" && oldRole != "doctor" && existingUser.DoctorID == nil {
		doctorFullName := existingUser.FullName
		if doctorFullName == "" {
			doctorFullName = existingUser.Username
		}

		newDoctor := models.Doctor{
			UserID:   &existingUser.ID,
			FullName: doctorFullName,
			Email:    existingUser.Email,
		}
		if err := models.CreateDoctor(&newDoctor); err != nil {
			log.Printf("Failed to create doctor record for user %d: %v", existingUser.ID, err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create doctor record"})
		}
		// Link the user to the doctor record
		existingUser.DoctorID = &newDoctor.ID
		if err := models.UpdateUser(existingUser); err != nil {
			log.Printf("Failed to link user %d to doctor record %d: %v", existingUser.ID, newDoctor.ID, err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to link user to doctor record"})
		}
	}

	// Remove sensitive data before returning
	existingUser.Password = ""
	return c.JSON(existingUser)
}

// DeleteUser deletes a user by ID
func DeleteUser(c *fiber.Ctx) error {
	userID := c.Params("id")

	// Validate UUID format
	if _, err := uuid.Parse(userID); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID format"})
	}

	// Authorization check - only admin can delete users
	authenticatedUserID := c.Locals("userID").(string)
	authenticatedUser, err := models.GetUserByID(authenticatedUserID)
	if err != nil || authenticatedUser.Role != "admin" {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
	}

	// Prevent admin from deleting themselves
	if userID == authenticatedUserID {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Cannot delete your own account"})
	}

	// Check if user exists before deletion
	_, err = models.GetUserByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
	}

	if err := models.DeleteUser(userID); err != nil {
		log.Printf("Error deleting user %s: %v", userID, err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete user"})
	}

	return c.SendStatus(http.StatusNoContent)
}

// validateUserUpdate validates user update data with enhanced checks
func validateUserUpdate(user *models.User, isAdmin bool) error {
	if user.Username != "" {
		username := strings.TrimSpace(user.Username)
		if len(username) < 3 || len(username) > 50 {
			return errors.New("username must be between 3 and 50 characters")
		}
		if !isValidUsername(username) {
			return errors.New("username contains invalid characters")
		}
	}

	if user.Email != "" {
		email := strings.TrimSpace(user.Email)
		if !isValidEmail(email) {
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

	if user.Role != "" && !isValidRole(user.Role) {
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

// isValidUsername checks if username contains only allowed characters
func isValidUsername(username string) bool {
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

// isValidEmail performs basic email validation
func isValidEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".") && len(email) > 5
}

// isValidRole checks if role is one of the allowed values
func isValidRole(role string) bool {
	allowedRoles := []string{"admin", "user", "doctor", "viewer", "staff_doctor"}
	for _, allowedRole := range allowedRoles {
		if role == allowedRole {
			return true
		}
	}
	return false
}

// UpdateUserTheme updates the theme preference for the authenticated user
func UpdateUserTheme(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req struct {
		Theme string `json:"theme"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Validate theme
	validThemes := []string{"light", "dark", "system", "medical-blue", "high-contrast"}
	isValid := false
	for _, theme := range validThemes {
		if req.Theme == theme {
			isValid = true
			break
		}
	}

	if !isValid {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid theme. Must be one of: light, dark, system, medical-blue, high-contrast"})
	}

	// Update user's theme preference
	user, err := models.GetUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	user.ThemePreference = req.Theme
	if err := models.UpdateUser(user); err != nil {
		log.Printf("Failed to update theme for user %s: %v", userID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update theme"})
	}

	return c.JSON(fiber.Map{
		"message": "Theme updated successfully",
		"theme":   req.Theme,
	})
}
