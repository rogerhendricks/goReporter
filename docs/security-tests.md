# Security Test Suite

This document describes the automated authentication and CSRF middleware tests added for the GoReporter backend, along with instructions to run them locally.

## Overview

The goal of the security test suite is to ensure the Fiber-based backend enforces robust authentication and CSRF protections. The suite lives primarily under `internal/handlers`, `internal/middleware`, and `internal/testutil`.

### Authentication flow coverage

- `internal/handlers/auth_test.go` exercises login and refresh handlers:
  - Successful login resets failed attempts and issues access/refresh cookies.
  - Account lockout triggers after `models.MaxLoginAttempts` failed tries and `models.User.IsLocked` remains `true`.
  - Refresh endpoint rotates refresh tokens, persists the new value, and revokes the old entry.
- `internal/middleware/auth_test.go` focuses on middleware behavior:
  - Valid JWTs carried via cookies or `Authorization` headers pass.
  - Missing tokens, invalid signatures, mismatched issuer/audience, or unknown users return `401/403` responses.
  - Role-based helpers (`RequireAdmin`, `RequireDoctor`, `RequireAdminOrUser`) only allow the configured roles.
  - `AuthorizeDoctorPatientAccess` now has integration-style tests ensuring doctors can only reach patients they are linked to, admins/users bypass association checks, and malformed patient IDs are rejected with 400s.

### CSRF protection coverage

- `internal/handlers/auth_test.go` now includes:
  - `/api/csrf-token` handler coverage (fresh token issuance, existing-cookie handling, production `Secure` flag enforcement, and rate-limit enforcement via 429 responses when the limiter threshold is exceeded).
  - `/logout` coverage ensuring refresh tokens are revoked, cookies are cleared, and revoked tokens cannot refresh sessions.
- `internal/middleware/csrf_test.go` validates middleware behavior:
  - Safe HTTP methods (`GET`, `HEAD`, `OPTIONS`) bypass checks.
  - Auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/refresh-token`) bypass checks per design.
  - Missing cookies or headers return `403` with descriptive payloads.
  - Token mismatches reject requests; matching tokens allow the request through.

### Test infrastructure

- `internal/testutil/testutil.go` sets up environment variables (`JWT_SECRET`, etc.) and configures an isolated SQLite database per test run. All tests that depend on `config.DB` should call `testutil.SetupTestEnv(t)` at the start of the test.
- Helper functions in the test files seed users, generate JWT tokens with custom claims, and perform HTTP requests via Fiber's `app.Test` utility.

## Running the tests

Because of missing legacy handlers elsewhere in the repository, running `go test ./...` may fail. Focus on the relevant packages:

```bash
# Middleware tests (authentication + CSRF)
go test ./internal/middleware

# Authentication handler tests
go test ./internal/handlers -run TestLogin -run TestRefresh -run TestGetCSRF
```

To run the entire security-focused suite:

```bash
# Run both handler and middleware packages
go test ./internal/middleware ./internal/handlers
```

> **Note:** The middleware tests expect environment variables to be set via `testutil.SetupTestEnv`. Do not skip that call; otherwise JWT configuration will be missing.

## Troubleshooting tips

- If you see `Error loading .env file`, it is emitted by `config.LoadConfig` but does not fail the tests as long as the environment variables are set via `testutil.SetupTestEnv`.
- If tests hang or fail due to database locks, ensure no leftover SQLite file remains from previous runs; the tests create temporary DBs inside `t.TempDir()`, so rerunning should be clean.
- When adding new security tests, reuse the helpers (`seedTestUser`, `generateCustomTestJWT`, `performCSRFRequest`) to keep setup consistent.
