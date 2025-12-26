// internal/middleware/auth.go
package middleware

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

func AuthenticateJWT(c *fiber.Ctx) error {
	// Skip auth for public endpoints
	publicPaths := []string{
		"/api/auth/login",
		"/api/auth/register",
		"/api/auth/refresh-token",
		"/api/csrf-token",
	}

	path := c.Path()
	for _, publicPath := range publicPaths {
		if path == publicPath {
			return c.Next()
		}
	}

	// Skip auth for static files
	if strings.HasPrefix(path, "/api/files/") ||
		strings.HasPrefix(path, "/assets/") ||
		path == "/" || path == "/index.html" {
		return c.Next()
	}

	// Try to get token from cookie first
	token := c.Cookies("access_token")

	// If not in cookie, try Authorization header (for backward compatibility during transition)
	if token == "" {
		token = c.Get("Authorization")
		if token != "" {
			token = strings.TrimPrefix(token, "Bearer ")
		}
	}

	if token == "" {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Authentication required"})
	}

	claims := &jwt.RegisteredClaims{}
	cfg := config.LoadConfig()

	tkn, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.JWTSecret), nil
	})

	if err != nil || !tkn.Valid {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired token"})
	}

	// var user models.User
	// if err := config.DB.First(&user, claims.Subject).Error; err != nil {
	//     return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
	//         "error": "User not found",
	//     })
	// }

	// Extract user ID from claims
	userID := claims.Subject
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid token claims",
		})
	}

	// Get user from database to get username and role
	user, err := models.GetUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	c.Locals("userID", userID)
	c.Locals("user", &user)
	c.Locals("user_id", user.ID) // Legacy variable for task.go handlers
	c.Locals("user_role", user.Role)

	c.Locals("username", user.Username)
	c.Locals("userRole", user.Role)
	fmt.Printf("Authenticated user %s with role %s\n", user.Username, user.Role)
	return c.Next()
}

func RequireRole(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID").(string)

		user, err := models.GetUserByID(userID)
		if err != nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
		}

		for _, role := range allowedRoles {
			if user.Role == role {
				c.Locals("userRole", user.Role)
				return c.Next()
			}
		}

		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
	}
}

func RequireAdmin(c *fiber.Ctx) error {
	return RequireRole("admin")(c)
}

func RequireDoctor(c *fiber.Ctx) error {
	return RequireRole("admin", "doctor")(c)
}

func RequireAdminOrUser(c *fiber.Ctx) error {
	return RequireRole("admin", "user")(c)
}

func AuthorizeDoctorPatientAccess(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals("userID").(string)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user session"})
	}

	patientIDStr := c.Params("id")
	if patientIDStr == "" {
		patientIDStr = c.Params("patientId")
	}
	if patientIDStr == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Patient ID is missing from the request"})
	}

	patientID, err := strconv.ParseUint(patientIDStr, 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Patient ID format"})
	}

	user, err := models.GetUserByID(userIDStr)
	if err != nil {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied: User not found"})
	}

	if user.Role == "admin" || user.Role == "user" {
		return c.Next()
	}

	if user.Role == "doctor" {
		isAssociated, err := models.IsDoctorAssociatedWithPatient(user.ID, uint(patientID))
		if err != nil {
			log.Printf("Error checking doctor-patient association: %v", err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not verify patient access"})
		}
		if isAssociated {
			return c.Next()
		}
	}

	return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied: You are not authorized to view this patient's data"})
}

func SetUserRole(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals("userID").(string)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user session"})
	}

	user, err := models.GetUserByID(userIDStr)
	if err != nil {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied: User not found"})
	}

	if user.Role == "admin" || user.Role == "user" || user.Role == "doctor" {
		c.Locals("userRole", user.Role)
		return c.Next()
	}

	return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions to view patient lists"})
}
