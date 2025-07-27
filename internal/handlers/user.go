package handlers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/models"
    "github.com/rogerhendricks/goReporter/internal/utils"
    "net/http"
    "log"
    "github.com/google/uuid"
    "strings"
    "html"
    "errors"
    "gorm.io/gorm"
)

// CreateUser creates a new user
func CreateUser(c *fiber.Ctx) error {
    var newUser models.User
    if err := c.BodyParser(&newUser); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }
    
    // Validate input
    if err := validateUserUpdate(&newUser, true); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    
    // Sanitize input
    newUser.Username = html.EscapeString(strings.TrimSpace(newUser.Username))
    newUser.Email = html.EscapeString(strings.TrimSpace(newUser.Email))
    
    // Hash password (assuming a HashPassword function exists)
    hashedPassword, err := models.HashPassword(newUser.Password)
    if err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
    }
    newUser.Password = hashedPassword
    
    // Create user in the database
    if err := models.CreateUser(&newUser); err != nil {
        log.Printf("Error creating user: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
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

// UpdateUserProfile updates the user profile information
func UpdateUserProfile(c *fiber.Ctx) error {
    userID := c.Params("id")
    
    // Validate UUID format
    if _, err := uuid.Parse(userID); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID format"})
    }
    
    // Authorization check - users can only update their own profile or admin can update any
    authenticatedUserID := c.Locals("userID").(string)
    isAdmin := false
    
    if userID != authenticatedUserID {
        authenticatedUser, err := models.GetUserByID(authenticatedUserID)
        if err != nil || authenticatedUser.Role != "admin" {
            return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
        }
        isAdmin = true
    }
    
    var updateData models.User
    if err := c.BodyParser(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }
    
    // Validate input
    if err := validateUserUpdate(&updateData, isAdmin); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    
    // Get existing user to preserve certain fields
    existingUser, err := models.GetUserByID(userID)
    if err != nil {
        log.Printf("Error fetching user %s: %v", userID, err)
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
        }
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    // Sanitize and update allowed fields
    if updateData.Username != "" {
        existingUser.Username = html.EscapeString(strings.TrimSpace(updateData.Username))
    }
    if updateData.Email != "" {
        existingUser.Email = html.EscapeString(strings.TrimSpace(updateData.Email))
    }
    
    // Only admin can change roles
    if isAdmin && updateData.Role != "" {
        existingUser.Role = html.EscapeString(strings.TrimSpace(updateData.Role))
    }
    
    // Don't allow password updates through this endpoint
    // Password should be updated through a separate, secure endpoint
    
    if err := models.UpdateUser(existingUser); err != nil {
        log.Printf("Error updating user %s: %v", userID, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update user"})
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

// validateUserUpdate validates user update data
func validateUserUpdate(user *models.User, isAdmin bool) error {
    if user.Username != "" {
        username := strings.TrimSpace(user.Username)
        if len(username) < 3 || len(username) > 50 {
            return errors.New("username must be between 3 and 50 characters")
        }
        if !utils.IsValidUsername(username) {
            return errors.New("username contains invalid characters")
        }
    }
    
    if user.Email != "" {
        email := strings.TrimSpace(user.Email)
        if !utils.IsValidEmail(email) {
            return errors.New("invalid email format")
        }
    }
    
    if user.Role != "" && !isAdmin {
        return errors.New("insufficient permissions to change role")
    }
    
    if user.Role != "" && !utils.IsValidRole(user.Role) {
        return errors.New("invalid role")
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
    allowedRoles := []string{"admin", "user", "viewer"}
    for _, allowedRole := range allowedRoles {
        if role == allowedRole {
            return true
        }
    }
    return false
}