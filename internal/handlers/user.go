package handlers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/models"
    // "github.com/rogerhendricks/goReporter/internal/utils"
    "strconv"
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

// UpdateUserProfile updates the user profile information
// func UpdateUserProfile(c *fiber.Ctx) error {
//     userID := c.Params("id")
    
//     // Validate UUID format
//     if _, err := uuid.Parse(userID); err != nil {
//         return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID format"})
//     }
    
//     // Authorization check - users can only update their own profile or admin can update any
//     authenticatedUserID := c.Locals("userID").(string)
//     isAdmin := false
    
//     if userID != authenticatedUserID {
//         authenticatedUser, err := models.GetUserByID(authenticatedUserID)
//         if err != nil || authenticatedUser.Role != "admin" {
//             return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
//         }
//         isAdmin = true
//     }
    
//     var updateData models.User
//     if err := c.BodyParser(&updateData); err != nil {
//         return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
//     }
    
//     // Validate input
//     if err := validateUserUpdate(&updateData, isAdmin); err != nil {
//         return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
//     }
    
//     // Get existing user to preserve certain fields
//     existingUser, err := models.GetUserByID(userID)
//     if err != nil {
//         log.Printf("Error fetching user %s: %v", userID, err)
//         if errors.Is(err, gorm.ErrRecordNotFound) {
//             return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
//         }
//         return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
//     }
    
//     // Sanitize and update allowed fields
//     if updateData.Username != "" {
//         existingUser.Username = html.EscapeString(strings.TrimSpace(updateData.Username))
//     }
//     if updateData.Email != "" {
//         existingUser.Email = html.EscapeString(strings.TrimSpace(updateData.Email))
//     }
    
//     // Only admin can change roles
//     if isAdmin && updateData.Role != "" {
//         existingUser.Role = html.EscapeString(strings.TrimSpace(updateData.Role))
//     }
    
//         // Allow admin to update password
//     if isAdmin && updateData.Password != "" {
//         hashedPassword, err := models.HashPassword(updateData.Password)
//         if err != nil {
//             return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
//         }
//         existingUser.Password = hashedPassword
//     }
    
//     // Don't allow password updates through this endpoint
//     // Password should be updated through a separate, secure endpoint
    
//     if err := models.UpdateUser(existingUser); err != nil {
//         log.Printf("Error updating user %s: %v", userID, err)
//         return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update user"})
//     }
    
//     // Remove sensitive data before returning
//     existingUser.Password = ""
//     return c.JSON(existingUser)
// }

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

    var updateData models.User
    if err := c.BodyParser(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }

    // Validate input
    if err := validateUserUpdate(&updateData, isAdmin); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // Get existing user using string conversion (as your GetUserByID expects string)
    existingUser, err := models.GetUserByID(userIDParam)
    if err != nil {
        log.Printf("Error fetching user %s: %v", userIDParam, err)
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
        }
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    // Check for username uniqueness if updating username
    if updateData.Username != "" && updateData.Username != existingUser.Username {
        existingUserByUsername, err := models.GetUserByUsername(updateData.Username)
        if err == nil && existingUserByUsername.ID != existingUser.ID {
            return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Username already exists"})
        }
    }

    // Check for email uniqueness if updating email
    if updateData.Email != "" && updateData.Email != existingUser.Email {
        existingUserByEmail, err := models.GetUserByEmail(updateData.Email)
        if err == nil && existingUserByEmail.ID != existingUser.ID {
            return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Email already exists"})
        }
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

    // Handle password updates (admin only through this endpoint)
    if isAdmin && updateData.Password != "" {
        hashedPassword, err := models.HashPassword(updateData.Password)
        if err != nil {
            return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
        }
        existingUser.Password = hashedPassword
    }

    // Handle doctor ID updates (admin only)
    if isAdmin && updateData.DoctorID != nil {
        existingUser.DoctorID = updateData.DoctorID
    }

    // Update user in the database
    if err := models.UpdateUser(existingUser); err != nil {
        log.Printf("Error updating user %s: %v", userIDParam, err)
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

    if user.Role != "" && !isAdmin {
        return errors.New("insufficient permissions to change role")
    }

    if user.Role != "" && !isValidRole(user.Role) {
        return errors.New("invalid role")
    }

    // Validate password if provided (admin only updates)
    if user.Password != "" && len(strings.TrimSpace(user.Password)) < 8 {
        return errors.New("password must be at least 8 characters long")
    }

    return nil
}

// func validateUserUpdate(user *models.User, isAdmin bool) error {
//     if user.Username != "" {
//         username := strings.TrimSpace(user.Username)
//         if len(username) < 3 || len(username) > 50 {
//             return errors.New("username must be between 3 and 50 characters")
//         }
//         if !utils.IsValidUsername(username) {
//             return errors.New("username contains invalid characters")
//         }
//     }
    
//     if user.Email != "" {
//         email := strings.TrimSpace(user.Email)
//         if !utils.IsValidEmail(email) {
//             return errors.New("invalid email format")
//         }
//     }
    
//     if user.Role != "" && !isAdmin {
//         return errors.New("insufficient permissions to change role")
//     }
    
//     if user.Role != "" && !utils.IsValidRole(user.Role) {
//         return errors.New("invalid role")
//     }
    
//     return nil
// }

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
    allowedRoles := []string{"admin", "user", "doctor"}
    for _, allowedRole := range allowedRoles {
        if role == allowedRole {
            return true
        }
    }
    return false
}