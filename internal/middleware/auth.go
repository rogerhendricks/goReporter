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
	token := c.Get("Authorization")
	if token == "" {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Authorization header missing"})
	}

	token = strings.TrimPrefix(token, "Bearer ")

	// Use jwt.RegisteredClaims instead of jwt.StandardClaims (deprecated in v5)
	claims := &jwt.RegisteredClaims{}

	// Load config to get JWT secret
	cfg := config.LoadConfig()

	tkn, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		// Add algorithm validation
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.JWTSecret), nil
	})

	if err != nil || !tkn.Valid {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token"})
	}

    var user models.User
    if err := config.DB.First(&user, claims.Subject).Error; err != nil {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "User not found",
        })
    }
	c.Locals("userID", claims.Subject)
	c.Locals("user", &user)
	c.Locals("user_id", user.ID)
	c.Locals("user_role", user.Role)

	return c.Next()
}

func RequireRole(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID").(string)

		// Get user from database to check role
		user, err := models.GetUserByID(userID)
		if err != nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
		}

		// Check if user's role is in allowed roles
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

// RequireDoctor requires the user to have either admin or doctor role
func RequireDoctor(c *fiber.Ctx) error {
	return RequireRole("admin", "doctor")(c)
}

// RequireAdminOrUser requires the user to have either admin or user role
func RequireAdminOrUser(c *fiber.Ctx) error {
	return RequireRole("admin", "user")(c)
}

// AuthorizeDoctorPatientAccess checks if a user has permission to view a specific patient's data.
// - Admins and Users have unrestricted access.
// - Doctors can only access patients they are associated with.
func AuthorizeDoctorPatientAccess(c *fiber.Ctx) error {
	// 1. Get User ID from JWT and Patient ID from URL param
	userIDStr, ok := c.Locals("userID").(string)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user session"})
	}

	patientIDStr := c.Params("id")
	if patientIDStr == "" {
		// Handle routes like /api/patients/:patientId/reports
		patientIDStr = c.Params("patientId")
	}
	if patientIDStr == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Patient ID is missing from the request"})
	}

	patientID, err := strconv.ParseUint(patientIDStr, 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Patient ID format"})
	}

	// 2. Get the full user object to check their role
	user, err := models.GetUserByID(userIDStr)
	if err != nil {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied: User not found"})
	}

	// 3. Grant access to Admins and general Users immediately
	if user.Role == "admin" || user.Role == "user" {
		return c.Next()
	}

	// 4. For Doctors, perform the specific association check
	if user.Role == "doctor" {
		isAssociated, err := models.IsDoctorAssociatedWithPatient(user.ID, uint(patientID))
		if err != nil {
			log.Printf("Error checking doctor-patient association: %v", err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not verify patient access"})
		}
		if isAssociated {
			return c.Next() // Access granted for this doctor
		}
	}

	// 5. If none of the above conditions are met, deny access.
	// This will apply to doctors not associated with the patient, or any other future roles.
	return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied: You are not authorized to view this patient's data"})
}

func SetUserRole(c *fiber.Ctx) error {
    userIDStr, ok := c.Locals("userID").(string)
    if !ok {
        // This should technically be caught by AuthenticateJWT, but good to have.
        return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user session"})
    }

    user, err := models.GetUserByID(userIDStr)
    if err != nil {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied: User not found"})
    }

    // All authenticated roles (admin, user, doctor) are allowed to access list views.
    // The handler is responsible for filtering the list based on the role.
    if user.Role == "admin" || user.Role == "user" || user.Role == "doctor" {
        c.Locals("userRole", user.Role)
        return c.Next()
    }

    return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions to view patient lists"})
}

// RequireDoctorPatientAccess checks if a doctor user can access a specific patient
// Admin users always have access. Doctor users must be associated with the patient.
// func RequireDoctorPatientAccess(c *fiber.Ctx) error {
//     userID := c.Locals("userID").(string)

//     // Get user from database to check role
//     user, err := models.GetUserByID(userID)
//     if err != nil {
//         return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
//     }

//     // Admin users always have access
//     if user.Role == "admin" {
//         c.Locals("userRole", user.Role)
//         return c.Next()
//     }

//     // Doctor users need to be checked for patient access
//     if user.Role == "doctor" {
//         patientIDStr := c.Params("id")
//         if patientIDStr == "" {
//             patientIDStr = c.Params("patientId")
//         }

//         if patientIDStr == "" {
//             return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Patient ID required"})
//         }

//         patientID, err := strconv.ParseUint(patientIDStr, 10, 32)
//         if err != nil {
//             return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patient ID format"})
//         }

//         canAccess, err := models.CanDoctorAccessPatient(userID, uint(patientID))
//         if err != nil {
//             return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check patient access"})
//         }

//         if !canAccess {
//             return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied to this patient"})
//         }

//         c.Locals("userRole", user.Role)
//         return c.Next()
//     }

//     return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
// }
