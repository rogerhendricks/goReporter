package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func setupCSRFMiddlewareApp() *fiber.App {
	app := fiber.New()
	app.Use(ValidateCSRF)

	successHandler := func(c *fiber.Ctx) error {
		return c.SendStatus(http.StatusOK)
	}

	app.Post("/mutate", successHandler)
	app.Get("/mutate", successHandler)
	app.Post("/api/auth/login", successHandler)

	return app
}

func performCSRFRequest(t *testing.T, app *fiber.App, method, path, cookieToken, headerToken string) *http.Response {
	t.Helper()

	req := httptest.NewRequest(method, path, nil)
	if cookieToken != "" {
		req.AddCookie(&http.Cookie{Name: "csrf_token", Value: cookieToken})
	}
	if headerToken != "" {
		req.Header.Set("X-CSRF-Token", headerToken)
	}

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	return resp
}

func TestValidateCSRFSkipsSafeMethods(t *testing.T) {
	app := setupCSRFMiddlewareApp()

	resp := performCSRFRequest(t, app, http.MethodGet, "/mutate", "", "")
	t.Cleanup(func() { _ = resp.Body.Close() })

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected GET to bypass CSRF, got %d", resp.StatusCode)
	}
}

func TestValidateCSRFFailsWithoutCookie(t *testing.T) {
	app := setupCSRFMiddlewareApp()

	resp := performCSRFRequest(t, app, http.MethodPost, "/mutate", "", "header-token")
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 when cookie missing, got %d", resp.StatusCode)
	}
}

func TestValidateCSRFFailsWithoutHeader(t *testing.T) {
	app := setupCSRFMiddlewareApp()

	resp := performCSRFRequest(t, app, http.MethodPost, "/mutate", "cookie-token", "")
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 when header missing, got %d", resp.StatusCode)
	}
}

func TestValidateCSRFFailsOnMismatch(t *testing.T) {
	app := setupCSRFMiddlewareApp()

	resp := performCSRFRequest(t, app, http.MethodPost, "/mutate", "cookie-token", "other-token")
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 on token mismatch, got %d", resp.StatusCode)
	}
}

func TestValidateCSRFAcceptsMatchingTokens(t *testing.T) {
	app := setupCSRFMiddlewareApp()

	resp := performCSRFRequest(t, app, http.MethodPost, "/mutate", "same-token", "same-token")
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 when tokens match, got %d", resp.StatusCode)
	}
}

func TestValidateCSRFSkipsAuthEndpoints(t *testing.T) {
	app := setupCSRFMiddlewareApp()

	resp := performCSRFRequest(t, app, http.MethodPost, "/api/auth/login", "", "")
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected auth endpoints to bypass CSRF, got %d", resp.StatusCode)
	}
}
