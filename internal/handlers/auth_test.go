package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"

	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/rogerhendricks/goReporter/internal/testutil"
)

func setupAuthTestApp(t *testing.T) *fiber.App {
	t.Helper()
	testutil.SetupTestEnv(t)
	return fiber.New()
}

func setupCSRFIssuanceApp(t *testing.T, env string) *fiber.App {
	t.Helper()
	testutil.SetupTestEnv(t)
	if env != "" {
		t.Setenv("APP_ENV", env)
	}
	app := fiber.New()
	app.Get("/api/csrf-token", GetCSRFToken)
	return app
}

func setupLimitedCSRFIssuanceApp(t *testing.T, maxRequests int, window time.Duration) *fiber.App {
	t.Helper()
	testutil.SetupTestEnv(t)
	app := fiber.New()

	app.Use(limiter.New(limiter.Config{
		Max:        maxRequests,
		Expiration: window,
		KeyGenerator: func(c *fiber.Ctx) string {
			return "test"
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "rate limit exceeded",
			})
		},
	}))

	app.Get("/api/csrf-token", GetCSRFToken)
	return app
}

func seedTestUser(t *testing.T, username, password, role string, mutate ...func(*models.User)) *models.User {
	t.Helper()

	hashed, err := models.HashPassword(password)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	user := &models.User{
		Username: username,
		Email:    fmt.Sprintf("%s@example.com", username),
		Password: hashed,
		Role:     role,
	}

	for _, fn := range mutate {
		fn(user)
	}

	if err := config.DB.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	return user
}

func performLoginRequest(t *testing.T, app *fiber.App, username, password string) *http.Response {
	t.Helper()

	body, err := json.Marshal(LoginRequest{Username: username, Password: password})
	if err != nil {
		t.Fatalf("failed to marshal login payload: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("login request failed: %v", err)
	}

	return resp
}

func extractCookie(resp *http.Response, name string) *http.Cookie {
	for _, c := range resp.Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

func TestLoginSuccessSetsCookiesAndResetsFailures(t *testing.T) {
	app := setupAuthTestApp(t)
	password := "S3curePa$$A9Z!"
	user := seedTestUser(t, "alice", password, "admin")

	// Pre-populate failed attempts to ensure handler resets them.
	if err := config.DB.Model(user).Update("failed_login_attempts", 2).Error; err != nil {
		t.Fatalf("failed to seed failed attempts: %v", err)
	}

	app.Post("/login", Login)

	resp := performLoginRequest(t, app, "alice", password)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}

	if extractCookie(resp, "access_token") == nil {
		t.Fatalf("expected access_token cookie to be set")
	}
	if extractCookie(resp, "refresh_token") == nil {
		t.Fatalf("expected refresh_token cookie to be set")
	}

	var payload AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("failed to decode login response: %v", err)
	}

	if payload.User.Username != "alice" {
		t.Fatalf("expected username alice, got %s", payload.User.Username)
	}
	if payload.User.Password != "" {
		t.Fatalf("password should be cleared before response")
	}

	updated, err := models.GetUserByUsername("alice")
	if err != nil {
		t.Fatalf("failed to reload user: %v", err)
	}
	if updated.FailedLoginAttempts != 0 {
		t.Fatalf("expected failed attempts reset to 0, got %d", updated.FailedLoginAttempts)
	}
}

func TestLoginLockoutAfterFailedAttempts(t *testing.T) {
	app := setupAuthTestApp(t)
	_ = seedTestUser(t, "locked", "S3cureLock!A9Z", "user")

	app.Post("/login", Login)

	var lastResp *http.Response
	for i := 0; i < models.MaxLoginAttempts; i++ {
		lastResp = performLoginRequest(t, app, "locked", "wrong-password")
		lastResp.Body.Close()
	}

	if lastResp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected final response 403 Forbidden, got %d", lastResp.StatusCode)
	}

	user, err := models.GetUserByUsername("locked")
	if err != nil {
		t.Fatalf("failed to reload locked user: %v", err)
	}
	if !user.IsLocked() {
		t.Fatalf("expected user to be locked after %d failed attempts", models.MaxLoginAttempts)
	}
}

func TestLoginRejectsExpiredTemporaryUser(t *testing.T) {
	app := setupAuthTestApp(t)
	password := "TempP@ssw0rd!"
	expiredAt := time.Now().Add(-1 * time.Hour)
	seedTestUser(t, "temp-expired", password, "user", func(u *models.User) {
		u.IsTemporary = true
		u.ExpiresAt = &expiredAt
	})

	app.Post("/login", Login)

	resp := performLoginRequest(t, app, "temp-expired", password)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for expired temporary user, got %d", resp.StatusCode)
	}

	var payload map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if payload["error"] != "Temporary access has expired" {
		t.Fatalf("expected temporary access error, got %s", payload["error"])
	}
}

func TestRefreshTokenRotatesAndRevokesOld(t *testing.T) {
	app := setupAuthTestApp(t)
	user := seedTestUser(t, "refresh", "Renew@bleP@ssA9Z", "user")

	app.Post("/refresh-token", RefreshToken)

	refreshToken, err := models.GenerateRefreshToken()
	if err != nil {
		t.Fatalf("failed to generate refresh token: %v", err)
	}

	expiresAt := time.Now().Add(24 * time.Hour)
	if _, err := models.CreateRefreshToken(user.ID, refreshToken, expiresAt); err != nil {
		t.Fatalf("failed to persist refresh token: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/refresh-token", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: refreshToken})

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("refresh request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK on refresh, got %d", resp.StatusCode)
	}

	var payload RefreshResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("failed to decode refresh response: %v", err)
	}
	if payload.User.Username != "refresh" {
		t.Fatalf("expected refreshed user to be returned")
	}

	newRefresh := extractCookie(resp, "refresh_token")
	if newRefresh == nil {
		t.Fatalf("expected rotated refresh token cookie")
	}
	if newRefresh.Value == refreshToken {
		t.Fatalf("expected refresh token value to change")
	}

	if _, err := models.ValidateRefreshToken(newRefresh.Value); err != nil {
		t.Fatalf("new refresh token not persisted: %v", err)
	}

	if _, err := models.ValidateRefreshToken(refreshToken); err == nil {
		t.Fatalf("expected old refresh token to be revoked")
	}
}

func TestRefreshTokenRejectsExpiredTemporaryUser(t *testing.T) {
	app := setupAuthTestApp(t)
	expiredAt := time.Now().Add(-30 * time.Minute)
	user := seedTestUser(t, "refresh-temp-expired", "Renew@bleP@ssA9Z", "user", func(u *models.User) {
		u.IsTemporary = true
		u.ExpiresAt = &expiredAt
	})

	app.Post("/refresh-token", RefreshToken)

	refreshToken, err := models.GenerateRefreshToken()
	if err != nil {
		t.Fatalf("failed to generate refresh token: %v", err)
	}

	expiresAt := time.Now().Add(24 * time.Hour)
	if _, err := models.CreateRefreshToken(user.ID, refreshToken, expiresAt); err != nil {
		t.Fatalf("failed to persist refresh token: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/refresh-token", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: refreshToken})

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("refresh request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for expired temporary refresh, got %d", resp.StatusCode)
	}

	var payload map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if payload["error"] != "Temporary access has expired" {
		t.Fatalf("expected temporary access error, got %s", payload["error"])
	}

	if _, err := models.ValidateRefreshToken(refreshToken); err == nil {
		t.Fatalf("expected refresh token to be revoked for expired user")
	}
}

func TestLogoutRevokesRefreshTokenAndPreventsReuse(t *testing.T) {
	app := setupAuthTestApp(t)
	password := "S3cureLogoutP@ssA9Z"
	user := seedTestUser(t, "logout-user", password, "user")

	app.Post("/login", Login)
	app.Post("/refresh-token", RefreshToken)
	app.Post("/logout", func(c *fiber.Ctx) error {
		c.Locals("userID", fmt.Sprintf("%d", user.ID))
		c.Locals("username", user.Username)
		return Logout(c)
	})

	loginResp := performLoginRequest(t, app, "logout-user", password)
	if loginResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK login, got %d", loginResp.StatusCode)
	}

	refreshCookie := extractCookie(loginResp, "refresh_token")
	if refreshCookie == nil {
		t.Fatalf("expected refresh cookie after login")
	}

	if _, err := models.ValidateRefreshToken(refreshCookie.Value); err != nil {
		t.Fatalf("refresh token missing before logout: %v", err)
	}

	logoutReq := httptest.NewRequest(http.MethodPost, "/logout", nil)
	logoutReq.AddCookie(refreshCookie)
	logoutResp, err := app.Test(logoutReq, -1)
	if err != nil {
		t.Fatalf("logout request failed: %v", err)
	}
	if logoutResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on logout, got %d", logoutResp.StatusCode)
	}

	clearedAccess := extractCookie(logoutResp, "access_token")
	if clearedAccess == nil || clearedAccess.Value != "" || clearedAccess.MaxAge != -1 {
		t.Fatalf("expected access token cookie to be cleared")
	}

	clearedRefresh := extractCookie(logoutResp, "refresh_token")
	if clearedRefresh == nil || clearedRefresh.Value != "" || clearedRefresh.MaxAge != -1 {
		t.Fatalf("expected refresh token cookie to be cleared")
	}

	if _, err := models.ValidateRefreshToken(refreshCookie.Value); err == nil {
		t.Fatalf("expected refresh token to be revoked after logout")
	}

	refreshReq := httptest.NewRequest(http.MethodPost, "/refresh-token", nil)
	refreshReq.AddCookie(&http.Cookie{Name: "refresh_token", Value: refreshCookie.Value})
	refreshResp, err := app.Test(refreshReq, -1)
	if err != nil {
		t.Fatalf("refresh request after logout failed: %v", err)
	}
	if refreshResp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 when using revoked refresh token, got %d", refreshResp.StatusCode)
	}
}

func TestGetCSRFTokensSetsCookieWithExpectedFlags(t *testing.T) {
	app := setupCSRFIssuanceApp(t, "")

	req := httptest.NewRequest(http.MethodGet, "/api/csrf-token", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("csrf token request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}

	cookie := extractCookie(resp, "csrf_token")
	if cookie == nil {
		t.Fatalf("expected csrf_token cookie to be set")
	}
	if cookie.HttpOnly {
		t.Fatalf("csrf_token cookie should be readable by JS")
	}
	if cookie.Secure {
		t.Fatalf("expected Secure=false outside production")
	}
	if cookie.Path != "/" {
		t.Fatalf("expected cookie path '/', got %s", cookie.Path)
	}
	if cookie.MaxAge != int((time.Hour).Seconds()) {
		t.Fatalf("expected MaxAge 3600, got %d", cookie.MaxAge)
	}
	if cookie.SameSite != http.SameSiteLaxMode {
		t.Fatalf("expected SameSite Lax, got %v", cookie.SameSite)
	}

	var payload map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if payload["csrfToken"] == "" {
		t.Fatalf("expected csrfToken in response body")
	}
}

func TestGetCSRFTokensRateLimitsRapidIssuance(t *testing.T) {
	app := setupLimitedCSRFIssuanceApp(t, 2, time.Minute)

	successReq := func() {
		req := httptest.NewRequest(http.MethodGet, "/api/csrf-token", nil)
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatalf("csrf token request failed: %v", err)
		}
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK before limit, got %d", resp.StatusCode)
		}
		resp.Body.Close()
	}

	successReq()
	successReq()

	req := httptest.NewRequest(http.MethodGet, "/api/csrf-token", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("csrf token request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected 429 after exceeding limit, got %d", resp.StatusCode)
	}

	var payload map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("failed to decode rate limit response: %v", err)
	}

	if payload["error"] != "rate limit exceeded" {
		t.Fatalf("expected rate limit error message, got %s", payload["error"])
	}
}

func TestGetCSRFTokensHonorsExistingCookie(t *testing.T) {
	app := setupCSRFIssuanceApp(t, "")

	req := httptest.NewRequest(http.MethodGet, "/api/csrf-token", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "existing-token"})

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("csrf token request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}

	if cookie := extractCookie(resp, "csrf_token"); cookie != nil {
		t.Fatalf("expected handler not to reset cookie when already present")
	}

	var payload map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if payload["csrfToken"] != "existing-token" {
		t.Fatalf("expected existing token to be returned, got %s", payload["csrfToken"])
	}
}

func TestGetCSRFTokensMarksSecureInProduction(t *testing.T) {
	app := setupCSRFIssuanceApp(t, "production")

	req := httptest.NewRequest(http.MethodGet, "/api/csrf-token", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("csrf token request failed: %v", err)
	}
	defer resp.Body.Close()

	cookie := extractCookie(resp, "csrf_token")
	if cookie == nil {
		t.Fatalf("expected csrf_token cookie to be set")
	}

	if !cookie.Secure {
		t.Fatalf("expected Secure flag when APP_ENV=production")
	}
}
