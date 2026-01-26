package middleware

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"

	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/rogerhendricks/goReporter/internal/testutil"
)

func setupAuthMiddlewareApp(t *testing.T) *fiber.App {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		return AuthenticateJWT(c)
	})
	app.Get("/protected", func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(string)
		if !ok || userID == "" {
			return c.SendStatus(http.StatusUnauthorized)
		}
		user, err := models.GetUserByID(userID)
		if err != nil {
			return c.SendStatus(http.StatusUnauthorized)
		}
		return c.JSON(fiber.Map{"user": user.Username, "role": user.Role})
	})
	return app
}

func setupAdminRouteApp() *fiber.App {
	app := fiber.New()
	app.Use(AuthenticateJWT)
	app.Get("/admin", RequireAdmin, func(c *fiber.Ctx) error {
		return c.SendStatus(http.StatusOK)
	})
	app.Get("/doctor", RequireDoctor, func(c *fiber.Ctx) error {
		return c.SendStatus(http.StatusOK)
	})
	app.Get("/user", RequireAdminOrUser, func(c *fiber.Ctx) error {
		return c.SendStatus(http.StatusOK)
	})
	return app
}

func seedMiddlewareUser(t *testing.T, username, role string, extra ...func(*models.User)) *models.User {
	t.Helper()

	user := &models.User{
		Username: username,
		Email:    fmt.Sprintf("%s@example.com", username),
		Password: "hashed-password",
		Role:     role,
	}

	for _, fn := range extra {
		fn(user)
	}

	if err := config.DB.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	return user
}

func generateCustomTestJWT(t *testing.T, userID uint, signingSecret string, mutate func(*jwt.RegisteredClaims)) string {
	t.Helper()

	cfg := config.LoadConfig()
	claims := jwt.RegisteredClaims{
		Subject:   fmt.Sprintf("%d", userID),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		NotBefore: jwt.NewNumericDate(time.Now()),
		Issuer:    cfg.JWTIssuer,
		Audience:  jwt.ClaimStrings{cfg.JWTAudience},
	}

	if mutate != nil {
		mutate(&claims)
	}

	secret := signingSecret
	if secret == "" {
		secret = cfg.JWTSecret
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign JWT: %v", err)
	}

	return signed
}

func generateTestJWT(t *testing.T, userID uint) string {
	return generateCustomTestJWT(t, userID, "", nil)
}

func TestAuthenticateJWTAllowsValidToken(t *testing.T) {
	testutil.SetupTestEnv(t)
	app := setupAuthMiddlewareApp(t)
	user := models.User{Username: "jwtuser", Email: "jwt@example.com", Role: "admin", Password: "hashed"}
	if err := config.DB.Create(&user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	token := generateTestJWT(t, user.ID)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: token})

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for valid token, got %d", resp.StatusCode)
	}
}

func TestAuthenticateJWTRejectsMissingToken(t *testing.T) {
	testutil.SetupTestEnv(t)
	app := setupAuthMiddlewareApp(t)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for missing token, got %d", resp.StatusCode)
	}
}

func TestAuthenticateJWTRejectsInvalidSignature(t *testing.T) {
	testutil.SetupTestEnv(t)
	app := setupAuthMiddlewareApp(t)
	user := seedMiddlewareUser(t, "bad-signature", "user")

	token := generateCustomTestJWT(t, user.ID, "different-secret", nil)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: token})

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for invalid signature, got %d", resp.StatusCode)
	}
}

func TestAuthenticateJWTRejectsInvalidIssuer(t *testing.T) {
	testutil.SetupTestEnv(t)
	app := setupAuthMiddlewareApp(t)
	user := seedMiddlewareUser(t, "wrong-issuer", "user")

	token := generateCustomTestJWT(t, user.ID, "", func(claims *jwt.RegisteredClaims) {
		claims.Issuer = "unexpected-issuer"
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: token})

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for invalid issuer, got %d", resp.StatusCode)
	}
}

func TestAuthenticateJWTRejectsInvalidAudience(t *testing.T) {
	testutil.SetupTestEnv(t)
	app := setupAuthMiddlewareApp(t)
	user := seedMiddlewareUser(t, "wrong-audience", "user")

	token := generateCustomTestJWT(t, user.ID, "", func(claims *jwt.RegisteredClaims) {
		claims.Audience = jwt.ClaimStrings{"unexpected-audience"}
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: token})

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for invalid audience, got %d", resp.StatusCode)
	}
}

func TestAuthenticateJWTAllowsAuthorizationHeader(t *testing.T) {
	testutil.SetupTestEnv(t)
	app := setupAuthMiddlewareApp(t)
	user := seedMiddlewareUser(t, "header-user", "user")
	token := generateTestJWT(t, user.ID)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for Authorization header token, got %d", resp.StatusCode)
	}
}

func TestRequireAdminAllowsAdmins(t *testing.T) {
	testutil.SetupTestEnv(t)
	app := setupAdminRouteApp()
	admin := seedMiddlewareUser(t, "admin-user", "admin")
	token := generateTestJWT(t, admin.ID)

	req := httptest.NewRequest(http.MethodGet, "/admin", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: token})

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for admin user, got %d", resp.StatusCode)
	}
}

func TestRequireDoctorAllowsDoctorAndAdmin(t *testing.T) {
	testutil.SetupTestEnv(t)
	app := setupAdminRouteApp()
	cases := []struct {
		name string
		role string
		code int
	}{
		{"doctor", "doctor", http.StatusOK},
		{"admin", "admin", http.StatusOK},
		{"user", "user", http.StatusForbidden},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			member := seedMiddlewareUser(t, fmt.Sprintf("%s-role", tc.name), tc.role)
			token := generateTestJWT(t, member.ID)

			req := httptest.NewRequest(http.MethodGet, "/doctor", nil)
			req.AddCookie(&http.Cookie{Name: "access_token", Value: token})

			resp, err := app.Test(req, -1)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tc.code {
				t.Fatalf("expected %d for %s, got %d", tc.code, tc.role, resp.StatusCode)
			}
		})
	}
}

func TestRequireAdminOrUserAllowsCorrectRoles(t *testing.T) {
	testutil.SetupTestEnv(t)
	app := setupAdminRouteApp()
	cases := []struct {
		name string
		role string
		code int
	}{
		{"admin allowed", "admin", http.StatusOK},
		{"user allowed", "user", http.StatusOK},
		{"doctor blocked", "doctor", http.StatusForbidden},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			member := seedMiddlewareUser(t, fmt.Sprintf("%s-role-user", tc.role), tc.role)
			token := generateTestJWT(t, member.ID)

			req := httptest.NewRequest(http.MethodGet, "/user", nil)
			req.AddCookie(&http.Cookie{Name: "access_token", Value: token})

			resp, err := app.Test(req, -1)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tc.code {
				t.Fatalf("expected %d for %s, got %d", tc.code, tc.role, resp.StatusCode)
			}
		})
	}
}

func TestRequireAdminOrUserBlocksUnauthorizedRoles(t *testing.T) {
	testutil.SetupTestEnv(t)
	app := setupAdminRouteApp()
	cases := []struct {
		name string
		role string
		path string
		code int
	}{
		{"admin allowed", "admin", "/user", http.StatusOK},
		{"user allowed", "user", "/user", http.StatusOK},
		{"doctor blocked", "doctor", "/user", http.StatusForbidden},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			member := seedMiddlewareUser(t, fmt.Sprintf("%s-role-user", tc.role), tc.role)
			token := generateTestJWT(t, member.ID)

			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			req.AddCookie(&http.Cookie{Name: "access_token", Value: token})

			resp, err := app.Test(req, -1)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tc.code {
				t.Fatalf("expected %d for %s, got %d", tc.code, tc.role, resp.StatusCode)
			}
		})
	}
}
