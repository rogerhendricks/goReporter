# Access Requests

Overview
--------

The Access Requests feature provides a lightweight, auditable workflow for doctors to request access to patient records and for administrators to approve or deny those requests. It supports both temporary and permanent access, with automatic expiry of temporary grants.

Key points
----------

- Doctors can request access to a patient (reason + optional expiry for temporary requests).
- Administrators review requests, approve or deny them, and may set or adjust an expiry for a temporary approval.
- Temporary access is enforced by the authorization layer and expires automatically.
- All requests are audited and associated with the granting action for traceability.
- Websocket notifications are used to push real-time toasts to relevant users (admins and requesting doctors). A small per-doctor fallback queue (session-scoped) ensures toasts are not lost when the doctor’s tab is not actively listening.

Data model
----------

- `access_requests` table (backend model `AccessRequest`):
  - `id`, `patient_id`, `requester_user_id`, `scope` (temporary|permanent), `expires_at` (optional), `reason`, `status` (pending|approved|denied|canceled), `resolved_by_user_id`, `resolved_at`, `resolution_note`, timestamps.
- `patient_doctors` join table extended fields:
  - `access_expires_at` (optional) — non-null means a temporary grant expires at this time.
  - `granted_by_access_request_id` (optional) — links the patient-doctor grant to the `AccessRequest` that created it.

APIs
----

The following endpoints are available (paths relative to the API base):

- `POST /api/access-requests` — Create a new access request (doctor).
- `GET /api/access-requests/mine` — List the requesting doctor's own requests.
- `GET /api/access-requests/:id` — View a single request (doctor or admin, with safe DTO).
- `GET /api/access-requests/patient-lookup?mrn=...` — Lookup patient by MRN to pre-fill a request form.

Admin endpoints

- `GET /api/admin/access-requests` — List and filter (by scope/status) pending requests (admin).
- `GET /api/admin/access-requests/:id` — Admin view for a single request.
- `PUT /api/admin/access-requests/:id/approve` — Approve a request (admin). Transactionally updates/creates `patient_doctors` association and records `granted_by_access_request_id`.
- `PUT /api/admin/access-requests/:id/deny` — Deny a request (admin).

Frontend flows
--------------

- Doctor flow:
  - Doctor navigates to the Request Access page to lookup a patient and submit a temporary or permanent request with an optional reason and expiry.
  - The doctor can view their own requests via the "My Access Requests" page (API backed).
  - When their request is approved or denied, a toast is delivered via websocket. If the doctor's tab is not currently listening, the toast is queued (session-scoped) and shown when the tab becomes visible.

- Admin flow:
  - Admins see an "Access Requests" card on the admin dashboard and a list page. The card defaults to the Temporary filter and resets to Temporary when reloaded.
  - Admins open a request detail page where they can approve (optionally setting an expiry for temporary grants) or deny and add a resolution note.
  - Approving a request creates/updates the `patient_doctors` record and triggers websocket notifications to the requester and other interested admins.

Notifications and toasts
-----------------------

- Notification payloads include an `actionUrl` and a reference to `accessRequestId` to let clients navigate to the request detail page when the user clicks the toast.
- Websockets are used for real-time delivery. For doctors, a small per-user fallback stored in `sessionStorage` (bounded queue, e.g., max 5 entries) will preserve toasts until the doctor re-opens or focuses a listening tab. The queue is session-scoped so it does not persist across browser sessions.

Security and behavior
---------------------

- Authorization checks enforce that temporary grants are valid only while `access_expires_at` is `NULL` or a future timestamp.
- Admin actions are audited; the `AccessRequest` stores who resolved it and when.
- Duplicate pending requests (same patient/same requester/same scope) are prevented.

UI notes
--------

- New sidebar entries:
  - Admin: `/admin/access-requests` (list/review)
  - Doctor: `/access-requests` (request form / my requests)
- Admin card behavior:
  - The Access Requests card shows pending items and provides a Temporary / Permanent filter. The card defaults to Temporary and resets to Temporary on mount.

Developer notes
---------------

- Backend model: `internal/models/access_request.go` — keep validation and status constants in the model file.
- Handlers: `internal/handlers/access_requests.go` — create/list/get/approve/deny logic.
- Notifications: `internal/services/notificationHub.go` — enrich events with `ActionURL` and `AccessRequestID`.
- Frontend:
  - Pages/components: `frontend/src/pages/accessRequests/RequestPatientAccess.tsx`, `frontend/src/pages/admin/AccessRequestsPage.tsx`, `frontend/src/components/admin/AccessRequestsCard.tsx`, `frontend/src/pages/admin/AccessRequestDetail.tsx`.
  - Hooks: `frontend/src/hooks/useUserNotifications.ts` — session fallback queue; `frontend/src/hooks/useAdminNotifications.ts` — actionUrl support.

Migration
---------

- AutoMigrate adds the `access_requests` table and alters `patient_doctors` to include `access_expires_at` and `granted_by_access_request_id`. Development startup applies migrations automatically.

Notes & next steps
------------------

- Add unit/integration tests covering creation and approval flows.
- Add a small "My Access Requests" listing page for doctors if desired.
- Consider long-term persistence for missed notifications if cross-session delivery is required.
