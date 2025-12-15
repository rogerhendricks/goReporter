package utils

import (
    "errors"
    "strings"
    "unicode"
)

// PasswordRequirements defines the minimum password requirements
const (
    MinPasswordLength        = 12
    RequireUppercase         = true
    RequireLowercase         = true
    RequireNumber            = true
    RequireSpecialChar       = true
    MinSpecialChars          = 1
    DisallowCommonPasswords  = true
)

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
    allowedRoles := []string{"admin", "user", "viewer", "doctor"}
    for _, allowedRole := range allowedRoles {
        if role == allowedRole {
            return true
        }
    }
    return false
}

// ValidatePasswordComplexity checks if a password meets security requirements
func ValidatePasswordComplexity(password string) error {
    if len(password) < MinPasswordLength {
        return errors.New("password must be at least 12 characters long")
    }

    var (
        hasUpper   bool
        hasLower   bool
        hasNumber  bool
        hasSpecial bool
    )

    for _, char := range password {
        switch {
        case unicode.IsUpper(char):
            hasUpper = true
        case unicode.IsLower(char):
            hasLower = true
        case unicode.IsNumber(char):
            hasNumber = true
        case unicode.IsPunct(char) || unicode.IsSymbol(char):
            hasSpecial = true
        }
    }

    if RequireUppercase && !hasUpper {
        return errors.New("password must contain at least one uppercase letter")
    }

    if RequireLowercase && !hasLower {
        return errors.New("password must contain at least one lowercase letter")
    }

    if RequireNumber && !hasNumber {
        return errors.New("password must contain at least one number")
    }

    if RequireSpecialChar && !hasSpecial {
        return errors.New("password must contain at least one special character (!@#$%^&*)")
    }

    // Check for common passwords
    if DisallowCommonPasswords && isCommonPassword(password) {
        return errors.New("this password is too common, please choose a more secure password")
    }

    // Check for sequential characters
    if hasSequentialChars(password) {
        return errors.New("password cannot contain sequential characters (e.g., 'abc', '123')")
    }

    // Check for repeated characters
    if hasRepeatedChars(password, 3) {
        return errors.New("password cannot contain 3 or more repeated characters")
    }

    return nil
}

// isCommonPassword checks against a list of common passwords
func isCommonPassword(password string) bool {
    // Lowercase for case-insensitive comparison
    pwd := strings.ToLower(password)
    
    commonPasswords := []string{
        "password", "password123", "123456", "12345678", "qwerty",
        "abc123", "monkey", "letmein", "trustno1", "dragon",
        "baseball", "iloveyou", "master", "sunshine", "ashley",
        "bailey", "shadow", "superman", "123456789", "password1",
        "welcome", "admin", "administrator", "root", "toor",
        "pass", "test", "guest", "oracle", "changeme",
    }

    for _, common := range commonPasswords {
        if pwd == common || strings.Contains(pwd, common) {
            return true
        }
    }

    return false
}

// hasSequentialChars checks for sequential characters
func hasSequentialChars(password string) bool {
    sequences := []string{
        "abc", "bcd", "cde", "def", "efg", "fgh", "ghi", "hij",
        "ijk", "jkl", "klm", "lmn", "mno", "nop", "opq", "pqr",
        "qrs", "rst", "stu", "tuv", "uvw", "vwx", "wxy", "xyz",
        "012", "123", "234", "345", "456", "567", "678", "789",
    }

    pwdLower := strings.ToLower(password)
    for _, seq := range sequences {
        if strings.Contains(pwdLower, seq) || strings.Contains(pwdLower, reverseString(seq)) {
            return true
        }
    }

    return false
}

// hasRepeatedChars checks for repeated characters
func hasRepeatedChars(password string, maxRepeat int) bool {
    if len(password) < maxRepeat {
        return false
    }

    for i := 0; i <= len(password)-maxRepeat; i++ {
        char := password[i]
        repeated := true
        for j := 1; j < maxRepeat; j++ {
            if password[i+j] != char {
                repeated = false
                break
            }
        }
        if repeated {
            return true
        }
    }

    return false
}

// reverseString reverses a string
func reverseString(s string) string {
    runes := []rune(s)
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        runes[i], runes[j] = runes[j], runes[i]
    }
    return string(runes)
}