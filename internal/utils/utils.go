package utils

import "strings"

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

// IsValidEmail performs basic email validation
func IsValidEmail(email string) bool {
    return strings.Contains(email, "@") && strings.Contains(email, ".") && len(email) > 5
}

// IsValidRole checks if role is one of the allowed values
func IsValidRole(role string) bool {
    allowedRoles := []string{"admin", "user", "viewer"}
    for _, allowedRole := range allowedRoles {
        if role == allowedRole {
            return true
        }
    }
    return false
}