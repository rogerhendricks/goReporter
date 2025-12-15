// internal/handlers/auth.go
package handlers

import (
    "fmt"
    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
    "github.com/rogerhendricks/goReporter/internal/models"
    "github.com/rogerhendricks/goReporter/internal/utils"
    "github.com/rogerhendricks/goReporter/internal/config"
    "github.com/rogerhendricks/goReporter/internal/security"
    "net/http"
    "time"
    "strings"
    // "html"
    "errors"
    // "gorm.io/gorm"
    "log"
    "os"
    "crypto/rand"
)

type LoginRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

type RegisterRequest struct {
    Username string `json:"username"`
    Email    string `json:"email"`
    Password string `json:"password"`
    Role     string `json:"role,omitempty"`
}

type AuthResponse struct {
    User  models.User `json:"user"`
}

type RefreshResponse struct {
    User models.User `json:"user"`
}

const (
    AccessTokenDuration  = 15 * time.Minute
    RefreshTokenDuration = 7 * 24 * time.Hour // 7 days
)

// Login handles user login requests
func Login(c *fiber.Ctx) error {
    var loginReq LoginRequest
    if err := c.BodyParser(&loginReq); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }

    // Validate input
    if strings.TrimSpace(loginReq.Username) == "" || strings.TrimSpace(loginReq.Password) == "" {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Username and password are required"})
    }

    // Sanitize input
    // username := html.EscapeString(strings.TrimSpace(loginReq.Username))
    // GORM uses parameterized queries, reducing SQL injection risk
    username := strings.TrimSpace(loginReq.Username)
    log.Printf("Login attempt for user: %s from IP: %s", username, c.IP())

    // Get user from database
    user, err := models.GetUserByUsername(username)
    if err != nil {
        security.LogEventFromContext(c, security.EventLoginFailed, 
            fmt.Sprintf("Login attempt for non-existent user: %s", username), 
            "WARNING", 
            map[string]interface{}{"username": username})
        return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
    }

    // Check if account is locked
    if user.IsLocked() {
        security.LogEventFromContext(c, security.EventLoginFailed, 
            fmt.Sprintf("Login attempt on locked account: %s", username), 
            "WARNING", 
            map[string]interface{}{
                "username": username,
                "userId": user.ID,
                "lockedUntil": user.LockedUntil,
            })
        return c.Status(http.StatusForbidden).JSON(fiber.Map{
            "error": fmt.Sprintf("Account is locked. Try again after %s", user.LockedUntil.Format(time.RFC3339)),
        })
    }

    // Check if account was locked but lock has expired - auto-unlock
    if user.LockedUntil != nil && !user.IsLocked() {
        if err := user.UnlockAccount(); err != nil {
            log.Printf("Error auto-unlocking account for user %s: %v", username, err)
        }
    }

    // Verify password
    if !models.CheckPassword(loginReq.Password, user.Password) {
        // Increment failed login attempts
        if err := user.IncrementFailedAttempts(); err != nil {
            log.Printf("Error incrementing failed attempts for user %s: %v", username, err)
        }

        // Check if account is now locked after increment
        if user.FailedLoginAttempts >= models.MaxLoginAttempts {
            return c.Status(http.StatusForbidden).JSON(fiber.Map{
                "error": fmt.Sprintf("Account has been locked due to multiple failed login attempts. Please try again in %d minutes.", int(models.LockoutDuration.Minutes())),
            })
        }

        remainingAttempts := models.MaxLoginAttempts - user.FailedLoginAttempts
        return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
            "error": fmt.Sprintf("Invalid credentials. %d attempt(s) remaining before account lockout.", remainingAttempts),
        })
    }

    // Successful login - reset failed attempts if any
    if user.FailedLoginAttempts > 0 {
        if err := user.ResetFailedAttempts(); err != nil {
            log.Printf("Error resetting failed attempts for user %s: %v", username, err)
        }
    }

    // Generate tokens and set cookies
    // if err := setAuthCookies(c, user.ID); err != nil {
    //     log.Printf("Error setting auth cookies for user %d: %v", user.ID, err)
    //     return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create session"})
    // }

    if err := setAuthCookies(c, user.ID); err != nil {
        security.LogEventFromContext(c, security.EventLoginFailed, 
            "Failed to set auth cookies", 
            "CRITICAL", 
            map[string]interface{}{"userId": user.ID, "error": err.Error()})
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create session"})
    }

    security.LogEventFromContext(c, security.EventLogin, 
        fmt.Sprintf("Successful login: %s", username), 
        "INFO", 
        map[string]interface{}{
            "userId": fmt.Sprintf("%d", user.ID),
            "username": username,
            "role": user.Role,
        })

    // Remove sensitive data before returning
    user.Password = ""

    return c.Status(http.StatusOK).JSON(AuthResponse{
        User: *user,
    })
}

// Register handles user registration requests
func Register(c *fiber.Ctx) error {
    var registerReq RegisterRequest
    if err := c.BodyParser(&registerReq); err != nil {
        security.LogEventFromContext(c, security.EventRegister, "Invalid registration JSON", "WARNING", nil)
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }

    // Validate input
    if err := validateRegisterRequest(&registerReq); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // Sanitize input
    // registerReq.Username = html.EscapeString(strings.TrimSpace(registerReq.Username))
    // registerReq.Email = html.EscapeString(strings.TrimSpace(registerReq.Email))
    // GORM uses parameterized queries, reducing SQL injection risk
    registerReq.Username = strings.TrimSpace(registerReq.Username)
    registerReq.Email = strings.TrimSpace(registerReq.Email)
    
    // Set default role if not provided
    if registerReq.Role == "" {
        registerReq.Role = "user"
    }

    // Check if username already exists
    if _, err := models.GetUserByUsername(registerReq.Username); err == nil {
        return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Username already exists"})
    }

    // Check if email already exists
    if _, err := models.GetUserByEmail(registerReq.Email); err == nil {
        return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Email already exists"})
    }

    // Hash password
    hashedPassword, err := models.HashPassword(registerReq.Password)
    if err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
    }

    // Create user
    newUser := models.User{
        Username: registerReq.Username,
        Email:    registerReq.Email,
        Password: hashedPassword,
        Role:     registerReq.Role,
    }

    if err := models.CreateUser(&newUser); err != nil {
        security.LogEventFromContext(c, security.EventRegister, 
            "Failed to create user account", 
            "CRITICAL", 
            map[string]interface{}{
                "username": registerReq.Username,
                "error": err.Error(),
            })
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
    }

    security.LogEventFromContext(c, security.EventRegister, 
        fmt.Sprintf("New user registered: %s", registerReq.Username), 
        "INFO", 
        map[string]interface{}{
            "userId": newUser.ID,
            "username": newUser.Username,
            "role": newUser.Role,
        })

    // Generate tokens and set cookies
    if err := setAuthCookies(c, newUser.ID); err != nil {
        log.Printf("Error setting auth cookies for user %d: %v", newUser.ID, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create session"})
    }

    // Remove sensitive data before returning
    newUser.Password = ""

    return c.Status(http.StatusCreated).JSON(AuthResponse{
        User: newUser,
    })
}

// setAuthCookies generates both access and refresh tokens and sets them as HTTP-only cookies
func setAuthCookies(c *fiber.Ctx, userID uint) error {
    // Generate access token (JWT)
    accessToken, err := generateAccessToken(userID)
    if err != nil {
        return err
    }

    // Generate refresh token (random string)
    refreshToken, err := models.GenerateRefreshToken()
    if err != nil {
        return err
    }

    // Store refresh token in database
    expiresAt := time.Now().Add(RefreshTokenDuration)
    if err := models.CreateRefreshToken(userID, refreshToken, expiresAt); err != nil {
        return err
    }

    // Determine if we're in production
    isProduction := os.Getenv("ENVIRONMENT") == "production"

    // Set access token cookie
    c.Cookie(&fiber.Cookie{
        Name:     "access_token",
        Value:    accessToken,
        HTTPOnly: true,
        Secure:   isProduction, // Only send over HTTPS in production
        SameSite: "Lax",        // Changed from Strict to Lax for better compatibility
        MaxAge:   int(AccessTokenDuration.Seconds()),
        Path:     "/",
    })

    // Set refresh token cookie
    c.Cookie(&fiber.Cookie{
        Name:     "refresh_token",
        Value:    refreshToken,
        HTTPOnly: true,
        Secure:   isProduction,
        SameSite: "Lax",
        MaxAge:   int(RefreshTokenDuration.Seconds()),
        Path:     "/", // Only send to refresh endpoint
    })

    return nil
}

// generateAccessToken creates a short-lived JWT access token
func generateAccessToken(userID uint) (string, error) {
    cfg := config.LoadConfig()

    claims := jwt.RegisteredClaims{
        Subject:   fmt.Sprintf("%d", userID),
        ExpiresAt: jwt.NewNumericDate(time.Now().Add(AccessTokenDuration)),
        IssuedAt:  jwt.NewNumericDate(time.Now()),
        NotBefore: jwt.NewNumericDate(time.Now()),
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

    jwtSecret := cfg.JWTSecret
    if jwtSecret == "" {
        return "", errors.New("JWT_SECRET not set in environment variables")
    }

    tokenString, err := token.SignedString([]byte(jwtSecret))
    if err != nil {
        return "", err
    }

    return tokenString, nil
}

// RefreshToken handles token refresh requests
func RefreshToken(c *fiber.Ctx) error {
    // Get refresh token from cookie
    refreshToken := c.Cookies("refresh_token")
    if refreshToken == "" {
        return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Refresh token missing"})
    }

    // Validate refresh token
    token, err := models.ValidateRefreshToken(refreshToken)
    if err != nil {
        return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired refresh token"})
    }

    // Get user
    user, err := models.GetUserByID(fmt.Sprintf("%d", token.UserID))
    if err != nil {
        return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "User not found"})
    }

    // Revoke old refresh token (token rotation)
    if err := models.RevokeRefreshToken(refreshToken); err != nil {
        log.Printf("Error revoking old refresh token: %v", err)
    }

    // Generate new tokens and set cookies
    if err := setAuthCookies(c, user.ID); err != nil {
        log.Printf("Error setting new auth cookies for user %d: %v", user.ID, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to refresh session"})
    }

    // Remove sensitive data
    user.Password = ""

    return c.Status(http.StatusOK).JSON(RefreshResponse{
        User: *user,
    })
}

// GetCSRFToken returns the CSRF token for the client
func GetCSRFToken(c *fiber.Ctx) error {
    // Check if token already exists
    token := c.Cookies("csrf_token")
    
    // If no token exists, generate a new one
    if token == "" {
        token = generateCSRFToken()
        
        // Set the cookie
        c.Cookie(&fiber.Cookie{
            Name:     "csrf_token",
            Value:    token,
            HTTPOnly: false,  // Must be false so JavaScript can read it
            Secure:   os.Getenv("ENVIRONMENT") == "production",
            SameSite: "Lax",
            MaxAge:   int((1 * time.Hour).Seconds()),
            Path:     "/",
        })
    }
    
    return c.JSON(fiber.Map{
        "csrfToken": token,
    })
}

// Keep the generateCSRFToken function
func generateCSRFToken() string {
    b := make([]byte, 32)
    if _, err := rand.Read(b); err != nil {
        return fmt.Sprintf("%d", time.Now().UnixNano())
    }
    return fmt.Sprintf("%x", b)
}


// Logout handles user logout
func Logout(c *fiber.Ctx) error {
    // Get refresh token from cookie
    refreshToken := c.Cookies("refresh_token")
    
    // Revoke the refresh token if present
    if refreshToken != "" {
        if err := models.RevokeRefreshToken(refreshToken); err != nil {
            log.Printf("Error revoking refresh token on logout: %v", err)
        }
    }

    // Clear cookies
    c.Cookie(&fiber.Cookie{
        Name:     "access_token",
        Value:    "",
        HTTPOnly: true,
        Secure:   os.Getenv("ENVIRONMENT") == "production",
        SameSite: "Lax",
        MaxAge:   -1,
        Path:     "/",
    })

    c.Cookie(&fiber.Cookie{
        Name:     "refresh_token",
        Value:    "",
        HTTPOnly: true,
        Secure:   os.Getenv("ENVIRONMENT") == "production",
        SameSite: "Lax",
        MaxAge:   -1,
        Path:     "/",
    })

    return c.Status(http.StatusOK).JSON(fiber.Map{"message": "Logged out successfully"})
}

// GetMe retrieves the current user's information
func GetMe(c *fiber.Ctx) error {
    userID, ok := c.Locals("userID").(string)
    if !ok || userID == "" {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
    }
    
    user, err := models.GetUserByID(userID)
    if err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
    }

    user.Password = ""

    return c.Status(fiber.StatusOK).JSON(user)
}

// validateRegisterRequest validates registration input
func validateRegisterRequest(req *RegisterRequest) error {
    username := strings.TrimSpace(req.Username)
    email := strings.TrimSpace(req.Email)
    password := req.Password

    if len(username) < 3 || len(username) > 50 {
        return errors.New("username must be between 3 and 50 characters")
    }
    if !utils.IsValidUsername(username) {
        return errors.New("username contains invalid characters")
    }

    if !utils.IsValidEmail(email) {
        return errors.New("invalid email format")
    }

    // Use the new password complexity validation
    if err := utils.ValidatePasswordComplexity(password); err != nil {
        return err
    }

    if req.Role != "" && !utils.IsValidRole(req.Role) {
        return errors.New("invalid role")
    }

    return nil
}