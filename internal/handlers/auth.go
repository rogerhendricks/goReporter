package handlers

import (
    "fmt"
    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
    "github.com/rogerhendricks/goReporter/internal/models"
    "github.com/rogerhendricks/goReporter/internal/utils"
    "github.com/rogerhendricks/goReporter/internal/config"
    "net/http"
    "time"
    "strings"
    "html"
    "errors"
    "gorm.io/gorm"
    "log"
    "regexp"
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
    Token string      `json:"token"`
}

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
    username := html.EscapeString(strings.TrimSpace(loginReq.Username))

    // Get user from database
    user, err := models.GetUserByUsername(username)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
        }
        log.Printf("Error fetching user %s: %v", username, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    // Verify password
    if !models.CheckPassword(loginReq.Password, user.Password) {
        return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
    }

    // Generate JWT token
    token, err := generateJWT(user.ID)
    if err != nil {
        log.Printf("Error generating JWT for user %d: %v", user.ID, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
    }

    // Remove sensitive data before returning
    user.Password = ""

    return c.Status(http.StatusOK).JSON(AuthResponse{
        User:  *user,
        Token: token,
    })
}

// Register handles user registration requests
func Register(c *fiber.Ctx) error {
    var registerReq RegisterRequest
    if err := c.BodyParser(&registerReq); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }

    // Validate input
    if err := validateRegisterRequest(&registerReq); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // Sanitize input
    registerReq.Username = html.EscapeString(strings.TrimSpace(registerReq.Username))
    registerReq.Email = html.EscapeString(strings.TrimSpace(registerReq.Email))
    
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
        log.Printf("Error creating user: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
    }

    // Generate JWT token
    token, err := generateJWT(newUser.ID)
    if err != nil {
        log.Printf("Error generating JWT for user %d: %v", newUser.ID, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
    }

    // Remove sensitive data before returning
    newUser.Password = ""

    return c.Status(http.StatusCreated).JSON(AuthResponse{
        User:  newUser,
        Token: token,
    })
}

// generateJWT creates a JWT token for the user
func generateJWT(userID uint) (string, error) {

    // Load configuration
    cfg := config.LoadConfig()

    // Create the claims
    claims := jwt.RegisteredClaims{
        Subject:   fmt.Sprintf("%d", userID), 
        ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
        IssuedAt:  jwt.NewNumericDate(time.Now()),
        NotBefore: jwt.NewNumericDate(time.Now()),
    }

    // Create token with claims
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

    // Get JWT secret from environment
    jwtSecret := cfg.JWTSecret
    if jwtSecret == "" {
        return "", errors.New("JWT_SECRET not set in environment variables")
    }

    // Sign and get the complete encoded token as a string
    tokenString, err := token.SignedString([]byte(jwtSecret))
    if err != nil {
        return "", err
    }

    return tokenString, nil
}

func validatePasswordStrength(password string) error {
    if len(password) < 8 {
        return errors.New("password must be at least 12 characters")
    }
    hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
    hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
    hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
    hasSpecial := regexp.MustCompile(`[!@#$%^&*(),.?":{}|<>]`).MatchString(password)
    
    if !hasUpper || !hasLower || !hasNumber || !hasSpecial {
        return errors.New("password must contain uppercase, lowercase, number, and special character")
    }
    return nil
}


// validateRegisterRequest validates registration input
func validateRegisterRequest(req *RegisterRequest) error {
    username := strings.TrimSpace(req.Username)
    email := strings.TrimSpace(req.Email)
    password := req.Password

    // Validate username
    if len(username) < 3 || len(username) > 50 {
        return errors.New("username must be between 3 and 50 characters")
    }
    if !utils.IsValidUsername(username) {
        return errors.New("username contains invalid characters")
    }

    // Validate email
    if !utils.IsValidEmail(email) {
        return errors.New("invalid email format")
    }

    // Validate password
    if err := validatePasswordStrength(password); err != nil {
        return err
    }

    // Validate role if provided
    if req.Role != "" && !utils.IsValidRole(req.Role) {
        return errors.New("invalid role")
    }

    return nil
}

// Logout handles user logout
func Logout(c *fiber.Ctx) error {
    // Since you're using stateless JWT, just return success
    // In a real app, you might want to blacklist the token
    return c.Status(http.StatusOK).JSON(fiber.Map{"message": "Logged out successfully"})
}

// RefreshToken handles token refresh
func RefreshToken(c *fiber.Ctx) error {
    // For now, return an error since you don't have refresh token implementation
    return c.Status(http.StatusNotImplemented).JSON(fiber.Map{"error": "Refresh token not implemented"})
}

// GetMe retrieves the current user's information
func GetMe(c *fiber.Ctx) error {
    // The userID is set by the AuthenticateJWT middleware
    userID, ok := c.Locals("userID").(string)
    if !ok || userID == "" {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
    }
    user, err := models.GetUserByID(userID)
    // user, err := models.GetUserByID(userID)
    if err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
    }

    // IMPORTANT: Never send the password hash to the client
    user.Password = ""

    return c.Status(fiber.StatusOK).JSON(user)
}