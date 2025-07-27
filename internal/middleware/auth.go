package middleware

import (
    "fmt"
    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
    "github.com/rogerhendricks/goReporter/internal/config"
    "net/http"
    "strings"
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

    c.Locals("userID", claims.Subject)
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