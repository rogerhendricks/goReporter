package services

import (
	"bytes"
	"crypto/hmac"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/rogerhendricks/goReporter/internal/models"
	"gorm.io/gorm"
)

// WebhookPayload represents the standard payload sent to webhook endpoints
type WebhookPayload struct {
	Event     string                 `json:"event"`
	Timestamp string                 `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

// WebhookService handles webhook delivery
type WebhookService struct {
	db *gorm.DB
}

// NewWebhookService creates a new webhook service
func NewWebhookService(db *gorm.DB) *WebhookService {
	return &WebhookService{db: db}
}

// TriggerWebhooks sends webhook notifications for a given event
func (ws *WebhookService) TriggerWebhooks(event models.WebhookEvent, data map[string]interface{}) {
	var webhooks []models.Webhook

	// Find all active webhooks subscribed to this event
	ws.db.Where("active = ?", true).Find(&webhooks)

	for _, webhook := range webhooks {
		// Check if webhook is subscribed to this event
		subscribed := false
		for _, subscribedEvent := range webhook.Events {
			if subscribedEvent == string(event) {
				subscribed = true
				break
			}
		}

		if !subscribed {
			continue
		}

		// Deliver webhook asynchronously
		go ws.deliverWebhook(webhook, event, data)
	}
}

// deliverWebhook sends a webhook request to the specified endpoint
func (ws *WebhookService) deliverWebhook(webhook models.Webhook, event models.WebhookEvent, data map[string]interface{}) {
	startTime := time.Now()

	// Check webhook integration type
	isTeams := ws.isTeamsWebhook(webhook.URL)
	isEpic := webhook.IntegrationType == "epic"

	var payloadBytes []byte
	var err error

	if isEpic {
		// Format as Epic FHIR DiagnosticReport
		payloadBytes, err = ws.formatEpicFHIR(webhook, event, data)
	} else if isTeams {
		// Format as Teams Adaptive Card
		payloadBytes, err = ws.formatTeamsMessage(event, data)
	} else {
		// Standard JSON payload for Slack and others
		payload := WebhookPayload{
			Event:     string(event),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Data:      data,
		}
		payloadBytes, err = json.Marshal(payload)
	}

	if err != nil {
		ws.logDelivery(webhook.ID, event, "", 0, "", false, fmt.Sprintf("Failed to marshal payload: %v", err), 0)
		return
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", webhook.URL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		ws.logDelivery(webhook.ID, event, string(payloadBytes), 0, "", false, fmt.Sprintf("Failed to create request: %v", err), 0)
		return
	}

	// Set content type based on integration type
	if isEpic {
		req.Header.Set("Content-Type", "application/fhir+json")
	} else {
		req.Header.Set("Content-Type", "application/json")
	}

	req.Header.Set("User-Agent", "goReporter-Webhook/1.0")
	req.Header.Set("X-Webhook-Event", string(event))
	req.Header.Set("X-Webhook-ID", fmt.Sprintf("%d", webhook.ID))

	// Add Epic OAuth token for Epic integrations
	if isEpic && webhook.EpicClientID != "" && webhook.EpicPrivateKey != "" && webhook.EpicTokenURL != "" {
		accessToken, err := ws.getEpicAccessToken(webhook)
		if err != nil {
			ws.logDelivery(webhook.ID, event, string(payloadBytes), 0, "", false, fmt.Sprintf("Epic OAuth failed: %v", err), 0)
			ws.updateWebhookStats(webhook.ID, false)
			return
		}
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	}

	// Add signature if secret is configured (for non-Epic webhooks)
	if !isEpic && webhook.Secret != "" {
		signature := ws.generateSignature(payloadBytes, webhook.Secret)
		req.Header.Set("X-Webhook-Signature", signature)
	}

	// Send request with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	duration := time.Since(startTime).Milliseconds()

	if err != nil {
		ws.logDelivery(webhook.ID, event, string(payloadBytes), 0, "", false, fmt.Sprintf("Request failed: %v", err), duration)
		ws.updateWebhookStats(webhook.ID, false)
		return
	}
	defer resp.Body.Close()

	// Read response body
	responseBody, _ := io.ReadAll(resp.Body)

	success := resp.StatusCode >= 200 && resp.StatusCode < 300
	errorMsg := ""
	if !success {
		errorMsg = fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(responseBody))
	}

	ws.logDelivery(webhook.ID, event, string(payloadBytes), resp.StatusCode, string(responseBody), success, errorMsg, duration)
	ws.updateWebhookStats(webhook.ID, success)
}

// generateSignature creates an HMAC signature for the payload
func (ws *WebhookService) generateSignature(payload []byte, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payload)
	return "sha256=" + hex.EncodeToString(h.Sum(nil))
}

// getEpicAccessToken obtains an OAuth 2.0 access token using JWT Bearer flow
func (ws *WebhookService) getEpicAccessToken(webhook models.Webhook) (string, error) {
	// Parse the private key
	privateKey, err := parsePrivateKey(webhook.EpicPrivateKey)
	if err != nil {
		return "", fmt.Errorf("failed to parse Epic private key: %v", err)
	}

	// Create JWT claims
	now := time.Now()
	claims := jwt.MapClaims{
		"iss": webhook.EpicClientID,
		"sub": webhook.EpicClientID,
		"aud": webhook.EpicTokenURL,
		"jti": fmt.Sprintf("%d-%d", webhook.ID, now.Unix()),
		"exp": now.Add(5 * time.Minute).Unix(),
	}

	// Create and sign the JWT
	token := jwt.NewWithClaims(jwt.SigningMethodRS384, claims)
	signedToken, err := token.SignedString(privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign JWT: %v", err)
	}

	// Exchange JWT for access token
	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer")
	data.Set("client_assertion", signedToken)

	req, err := http.NewRequest("POST", webhook.EpicTokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("failed to create token request: %v", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token request returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResponse struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int    `json:"expires_in"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return "", fmt.Errorf("failed to decode token response: %v", err)
	}

	return tokenResponse.AccessToken, nil
}

// parsePrivateKey parses a PEM-encoded RSA private key
func parsePrivateKey(pemKey string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(pemKey))
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block")
	}

	// Try PKCS8 format first (most common for Epic)
	if key, err := x509.ParsePKCS8PrivateKey(block.Bytes); err == nil {
		if rsaKey, ok := key.(*rsa.PrivateKey); ok {
			return rsaKey, nil
		}
		return nil, fmt.Errorf("key is not RSA private key")
	}

	// Fallback to PKCS1 format
	return x509.ParsePKCS1PrivateKey(block.Bytes)
}

// logDelivery records a webhook delivery attempt
func (ws *WebhookService) logDelivery(webhookID uint, event models.WebhookEvent, payload string, statusCode int, response string, success bool, errorMsg string, duration int64) {
	delivery := models.WebhookDelivery{
		WebhookID:    webhookID,
		Event:        string(event),
		Payload:      payload,
		StatusCode:   statusCode,
		Response:     response,
		Success:      success,
		ErrorMessage: errorMsg,
		Duration:     duration,
	}

	ws.db.Create(&delivery)
}

// updateWebhookStats updates webhook success/failure counters
func (ws *WebhookService) updateWebhookStats(webhookID uint, success bool) {
	now := time.Now().Format(time.RFC3339)

	if success {
		ws.db.Model(&models.Webhook{}).Where("id = ?", webhookID).Updates(map[string]interface{}{
			"success_count":     gorm.Expr("success_count + 1"),
			"last_triggered_at": now,
		})
	} else {
		ws.db.Model(&models.Webhook{}).Where("id = ?", webhookID).Updates(map[string]interface{}{
			"failure_count": gorm.Expr("failure_count + 1"),
		})
	}
}

// TestWebhook sends a test payload to verify webhook configuration
func (ws *WebhookService) TestWebhook(webhookID uint) error {
	var webhook models.Webhook
	if err := ws.db.First(&webhook, webhookID).Error; err != nil {
		return fmt.Errorf("webhook not found: %v", err)
	}

	testData := map[string]interface{}{
		"test":    true,
		"message": "This is a test webhook from goReporter",
		"webhook": map[string]interface{}{
			"id":   webhook.ID,
			"name": webhook.Name,
		},
	}

	go ws.deliverWebhook(webhook, "webhook.test", testData)

	return nil
}

// formatEpicFHIR formats webhook data as Epic FHIR DiagnosticReport
func (ws *WebhookService) formatEpicFHIR(webhook models.Webhook, event models.WebhookEvent, data map[string]interface{}) ([]byte, error) {
	// Only format report.completed events as FHIR DiagnosticReports
	if event != models.EventReportCompleted {
		// For other events, return standard payload
		payload := WebhookPayload{
			Event:     string(event),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Data:      data,
		}
		return json.Marshal(payload)
	}

	// Create FHIR DiagnosticReport
	fhirReport := ws.createFHIRDiagnosticReport(data)
	return json.Marshal(fhirReport)
}

// createFHIRDiagnosticReport creates a FHIR R4 DiagnosticReport resource
func (ws *WebhookService) createFHIRDiagnosticReport(data map[string]interface{}) map[string]interface{} {
	// Extract data with type assertions and defaults
	reportID := fmt.Sprintf("%v", data["reportId"])
	patientMRN := fmt.Sprintf("%v", data["patientMRN"])
	reportDate := fmt.Sprintf("%v", data["reportDate"])
	reportURL := fmt.Sprintf("%v", data["reportUrl"])

	// Device information
	deviceType := getStringValue(data, "deviceType")
	deviceSerial := getStringValue(data, "deviceSerial")
	deviceManufacturer := getStringValue(data, "deviceManufacturer")

	// Battery information
	batteryStatus := getStringValue(data, "batteryStatus")
	batteryPercentage := getFloatValue(data, "batteryPercentage")

	// Pacing information
	atrialPacing := getFloatValue(data, "atrialPacing")
	ventricularPacing := getFloatValue(data, "ventricularPacing")

	// Build FHIR R4 DiagnosticReport
	fhirReport := map[string]interface{}{
		"resourceType": "DiagnosticReport",
		"id":           reportID,
		"status":       "final",
		"category": []map[string]interface{}{
			{
				"coding": []map[string]interface{}{
					{
						"system":  "http://terminology.hl7.org/CodeSystem/v2-0074",
						"code":    "MDC",
						"display": "Medical Device Communication",
					},
				},
			},
		},
		"code": map[string]interface{}{
			"coding": []map[string]interface{}{
				{
					"system":  "http://loinc.org",
					"code":    "34139-4",
					"display": "Pacemaker device interrogation report",
				},
			},
			"text": "Cardiac Device Interrogation Report",
		},
		"subject": map[string]interface{}{
			"reference": fmt.Sprintf("Patient/%s", patientMRN),
			"identifier": map[string]interface{}{
				"system": "urn:oid:2.16.840.1.113883.4.1", // MRN system OID
				"value":  patientMRN,
			},
		},
		"effectiveDateTime": reportDate,
		"issued":            time.Now().UTC().Format(time.RFC3339),
		"conclusion":        fmt.Sprintf("Cardiac device interrogation completed. Battery status: %s", batteryStatus),
		"presentedForm": []map[string]interface{}{
			{
				"contentType": "text/html",
				"url":         reportURL,
				"title":       "Full Interrogation Report",
			},
		},
	}

	// Add observations as result references
	var results []map[string]interface{}

	// Battery observations
	if batteryStatus != "" {
		results = append(results, map[string]interface{}{
			"reference": fmt.Sprintf("#battery-status-%s", reportID),
			"display":   fmt.Sprintf("Battery Status: %s", batteryStatus),
		})
	}

	if batteryPercentage > 0 {
		results = append(results, map[string]interface{}{
			"reference": fmt.Sprintf("#battery-percentage-%s", reportID),
			"display":   fmt.Sprintf("Battery Percentage: %.1f%%", batteryPercentage),
		})
	}

	// Pacing observations
	if atrialPacing > 0 {
		results = append(results, map[string]interface{}{
			"reference": fmt.Sprintf("#atrial-pacing-%s", reportID),
			"display":   fmt.Sprintf("Atrial Pacing: %.1f%%", atrialPacing),
		})
	}

	if ventricularPacing > 0 {
		results = append(results, map[string]interface{}{
			"reference": fmt.Sprintf("#ventricular-pacing-%s", reportID),
			"display":   fmt.Sprintf("Ventricular Pacing: %.1f%%", ventricularPacing),
		})
	}

	if len(results) > 0 {
		fhirReport["result"] = results
	}

	// Add device information as contained resource
	if deviceSerial != "" {
		fhirReport["contained"] = []map[string]interface{}{
			{
				"resourceType": "Device",
				"id":           fmt.Sprintf("device-%s", reportID),
				"identifier": []map[string]interface{}{
					{
						"type": map[string]interface{}{
							"coding": []map[string]interface{}{
								{
									"system":  "http://hl7.org/fhir/identifier-type",
									"code":    "SNO",
									"display": "Serial Number",
								},
							},
						},
						"value": deviceSerial,
					},
				},
				"manufacturer": deviceManufacturer,
				"deviceName": []map[string]interface{}{
					{
						"name": deviceType,
						"type": "model-name",
					},
				},
				"type": map[string]interface{}{
					"coding": []map[string]interface{}{
						{
							"system":  "http://snomed.info/sct",
							"code":    "360129009",
							"display": "Cardiac pacemaker, device",
						},
					},
				},
			},
		}
	}

	return fhirReport
}

// Helper functions for data extraction
func getStringValue(data map[string]interface{}, key string) string {
	if val, ok := data[key]; ok && val != nil {
		return fmt.Sprintf("%v", val)
	}
	return ""
}

func getFloatValue(data map[string]interface{}, key string) float64 {
	if val, ok := data[key]; ok && val != nil {
		switch v := val.(type) {
		case float64:
			return v
		case int:
			return float64(v)
		case string:
			// Try to parse string as float
			var f float64
			fmt.Sscanf(v, "%f", &f)
			return f
		}
	}
	return 0
}

// isTeamsWebhook detects if a URL is a Microsoft Teams webhook
func (ws *WebhookService) isTeamsWebhook(url string) bool {
	return strings.Contains(url, "office.com/webhook") ||
		strings.Contains(url, "outlook.office.com") ||
		strings.Contains(url, "outlook.office365.com")
}

// formatTeamsMessage creates a Microsoft Teams Adaptive Card payload
func (ws *WebhookService) formatTeamsMessage(event models.WebhookEvent, data map[string]interface{}) ([]byte, error) {
	var card interface{}

	switch event {
	case models.EventBatteryCritical:
		card = ws.createBatteryCriticalCard(data)
	case models.EventBatteryLow:
		card = ws.createBatteryLowCard(data)
	case models.EventReportCreated:
		card = ws.createReportCreatedCard(data)
	case models.EventTaskCreated:
		card = ws.createTaskCreatedCard(data)
	case models.EventTaskDue:
		card = ws.createTaskDueCard(data)
	case models.EventTaskOverdue:
		card = ws.createTaskOverdueCard(data)
	default:
		card = ws.createGenericCard(event, data)
	}

	return json.Marshal(card)
}

// createBatteryCriticalCard creates an Adaptive Card for critical battery alerts
func (ws *WebhookService) createBatteryCriticalCard(data map[string]interface{}) map[string]interface{} {
	facts := []map[string]interface{}{}

	if patientID, ok := data["patientId"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Patient ID:",
			"value": fmt.Sprintf("%v", patientID),
		})
	}

	if status, ok := data["batteryStatus"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Battery Status:",
			"value": fmt.Sprintf("%v", status),
		})
	}

	if voltage, ok := data["batteryVoltage"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Battery Voltage:",
			"value": fmt.Sprintf("%.2fV", voltage),
		})
	}

	if percentage, ok := data["batteryPercentage"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Battery Percentage:",
			"value": fmt.Sprintf("%.1f%%", percentage),
		})
	}

	if reportID, ok := data["reportId"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Report ID:",
			"value": fmt.Sprintf("%v", reportID),
		})
	}

	return map[string]interface{}{
		"type": "message",
		"attachments": []map[string]interface{}{
			{
				"contentType": "application/vnd.microsoft.card.adaptive",
				"content": map[string]interface{}{
					"type":    "AdaptiveCard",
					"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
					"version": "1.4",
					"body": []map[string]interface{}{
						{
							"type":  "Container",
							"style": "attention",
							"items": []map[string]interface{}{
								{
									"type":   "TextBlock",
									"text":   "🚨 Battery Alert - Critical",
									"weight": "Bolder",
									"size":   "Large",
									"color":  "Attention",
								},
							},
						},
						{
							"type":    "TextBlock",
							"text":    "A device battery has reached a critical status and requires immediate attention.",
							"wrap":    true,
							"spacing": "Medium",
						},
						{
							"type":    "FactSet",
							"facts":   facts,
							"spacing": "Medium",
						},
						{
							"type":    "TextBlock",
							"text":    fmt.Sprintf("Alert triggered at %s", time.Now().Format("Jan 2, 2006 3:04 PM")),
							"size":    "Small",
							"color":   "Accent",
							"spacing": "Medium",
						},
					},
				},
			},
		},
	}
}

// createBatteryLowCard creates an Adaptive Card for low battery alerts
func (ws *WebhookService) createBatteryLowCard(data map[string]interface{}) map[string]interface{} {
	facts := []map[string]interface{}{}

	if patientID, ok := data["patientId"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Patient ID:",
			"value": fmt.Sprintf("%v", patientID),
		})
	}

	if percentage, ok := data["batteryPercentage"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Battery Percentage:",
			"value": fmt.Sprintf("%.1f%%", percentage),
		})
	}

	if voltage, ok := data["batteryVoltage"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Battery Voltage:",
			"value": fmt.Sprintf("%.2fV", voltage),
		})
	}

	if reportID, ok := data["reportId"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Report ID:",
			"value": fmt.Sprintf("%v", reportID),
		})
	}

	return map[string]interface{}{
		"type": "message",
		"attachments": []map[string]interface{}{
			{
				"contentType": "application/vnd.microsoft.card.adaptive",
				"content": map[string]interface{}{
					"type":    "AdaptiveCard",
					"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
					"version": "1.4",
					"body": []map[string]interface{}{
						{
							"type":  "Container",
							"style": "warning",
							"items": []map[string]interface{}{
								{
									"type":   "TextBlock",
									"text":   "⚠️ Battery Alert - Low",
									"weight": "Bolder",
									"size":   "Large",
									"color":  "Warning",
								},
							},
						},
						{
							"type":    "TextBlock",
							"text":    "A device battery is running low. Please schedule replacement soon.",
							"wrap":    true,
							"spacing": "Medium",
						},
						{
							"type":    "FactSet",
							"facts":   facts,
							"spacing": "Medium",
						},
						{
							"type":    "TextBlock",
							"text":    fmt.Sprintf("Alert triggered at %s", time.Now().Format("Jan 2, 2006 3:04 PM")),
							"size":    "Small",
							"color":   "Accent",
							"spacing": "Medium",
						},
					},
				},
			},
		},
	}
}

// createReportCreatedCard creates an Adaptive Card for report creation
func (ws *WebhookService) createReportCreatedCard(data map[string]interface{}) map[string]interface{} {
	facts := []map[string]interface{}{}

	if reportID, ok := data["reportId"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Report ID:",
			"value": fmt.Sprintf("%v", reportID),
		})
	}

	if patientID, ok := data["patientId"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Patient ID:",
			"value": fmt.Sprintf("%v", patientID),
		})
	}

	if reportType, ok := data["reportType"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Report Type:",
			"value": fmt.Sprintf("%v", reportType),
		})
	}

	if reportStatus, ok := data["reportStatus"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Status:",
			"value": fmt.Sprintf("%v", reportStatus),
		})
	}

	return map[string]interface{}{
		"type": "message",
		"attachments": []map[string]interface{}{
			{
				"contentType": "application/vnd.microsoft.card.adaptive",
				"content": map[string]interface{}{
					"type":    "AdaptiveCard",
					"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
					"version": "1.4",
					"body": []map[string]interface{}{
						{
							"type":  "Container",
							"style": "good",
							"items": []map[string]interface{}{
								{
									"type":   "TextBlock",
									"text":   "📄 New Report Created",
									"weight": "Bolder",
									"size":   "Large",
									"color":  "Good",
								},
							},
						},
						{
							"type":    "TextBlock",
							"text":    "A new device report has been created and is ready for review.",
							"wrap":    true,
							"spacing": "Medium",
						},
						{
							"type":    "FactSet",
							"facts":   facts,
							"spacing": "Medium",
						},
						{
							"type":    "TextBlock",
							"text":    fmt.Sprintf("Created at %s", time.Now().Format("Jan 2, 2006 3:04 PM")),
							"size":    "Small",
							"color":   "Accent",
							"spacing": "Medium",
						},
					},
				},
			},
		},
	}
}

// createTaskCreatedCard creates an Adaptive Card for task creation
func (ws *WebhookService) createTaskCreatedCard(data map[string]interface{}) map[string]interface{} {
	facts := []map[string]interface{}{}

	if taskID, ok := data["taskId"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Task ID:",
			"value": fmt.Sprintf("%v", taskID),
		})
	}

	if title, ok := data["title"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Title:",
			"value": fmt.Sprintf("%v", title),
		})
	}

	if priority, ok := data["priority"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Priority:",
			"value": fmt.Sprintf("%v", priority),
		})
	}

	if dueDate, ok := data["dueDate"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Due Date:",
			"value": fmt.Sprintf("%v", dueDate),
		})
	}

	if patientID, ok := data["patientId"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Patient ID:",
			"value": fmt.Sprintf("%v", patientID),
		})
	}

	description := ""
	if desc, ok := data["description"].(string); ok && desc != "" {
		description = desc
	} else {
		description = "No description provided"
	}

	return map[string]interface{}{
		"type": "message",
		"attachments": []map[string]interface{}{
			{
				"contentType": "application/vnd.microsoft.card.adaptive",
				"content": map[string]interface{}{
					"type":    "AdaptiveCard",
					"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
					"version": "1.4",
					"body": []map[string]interface{}{
						{
							"type":  "Container",
							"style": "emphasis",
							"items": []map[string]interface{}{
								{
									"type":   "TextBlock",
									"text":   "✅ New Task Created",
									"weight": "Bolder",
									"size":   "Large",
								},
							},
						},
						{
							"type":    "TextBlock",
							"text":    description,
							"wrap":    true,
							"spacing": "Medium",
						},
						{
							"type":    "FactSet",
							"facts":   facts,
							"spacing": "Medium",
						},
						{
							"type":    "TextBlock",
							"text":    fmt.Sprintf("Created at %s", time.Now().Format("Jan 2, 2006 3:04 PM")),
							"size":    "Small",
							"color":   "Accent",
							"spacing": "Medium",
						},
					},
				},
			},
		},
	}
}

// createTaskDueCard creates an Adaptive Card for tasks due today
func (ws *WebhookService) createTaskDueCard(data map[string]interface{}) map[string]interface{} {
	facts := []map[string]interface{}{}

	if taskID, ok := data["taskId"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Task ID:",
			"value": fmt.Sprintf("%v", taskID),
		})
	}

	if title, ok := data["title"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Title:",
			"value": fmt.Sprintf("%v", title),
		})
	}

	if priority, ok := data["priority"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Priority:",
			"value": fmt.Sprintf("%v", priority),
		})
	}

	return map[string]interface{}{
		"type": "message",
		"attachments": []map[string]interface{}{
			{
				"contentType": "application/vnd.microsoft.card.adaptive",
				"content": map[string]interface{}{
					"type":    "AdaptiveCard",
					"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
					"version": "1.4",
					"body": []map[string]interface{}{
						{
							"type":  "Container",
							"style": "warning",
							"items": []map[string]interface{}{
								{
									"type":   "TextBlock",
									"text":   "⏰ Task Due Today",
									"weight": "Bolder",
									"size":   "Large",
									"color":  "Warning",
								},
							},
						},
						{
							"type":    "TextBlock",
							"text":    "This task is due today and requires your attention.",
							"wrap":    true,
							"spacing": "Medium",
						},
						{
							"type":    "FactSet",
							"facts":   facts,
							"spacing": "Medium",
						},
					},
				},
			},
		},
	}
}

// createTaskOverdueCard creates an Adaptive Card for overdue tasks
func (ws *WebhookService) createTaskOverdueCard(data map[string]interface{}) map[string]interface{} {
	facts := []map[string]interface{}{}

	if taskID, ok := data["taskId"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Task ID:",
			"value": fmt.Sprintf("%v", taskID),
		})
	}

	if title, ok := data["title"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Title:",
			"value": fmt.Sprintf("%v", title),
		})
	}

	if dueDate, ok := data["dueDate"]; ok {
		facts = append(facts, map[string]interface{}{
			"title": "Was Due:",
			"value": fmt.Sprintf("%v", dueDate),
		})
	}

	return map[string]interface{}{
		"type": "message",
		"attachments": []map[string]interface{}{
			{
				"contentType": "application/vnd.microsoft.card.adaptive",
				"content": map[string]interface{}{
					"type":    "AdaptiveCard",
					"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
					"version": "1.4",
					"body": []map[string]interface{}{
						{
							"type":  "Container",
							"style": "attention",
							"items": []map[string]interface{}{
								{
									"type":   "TextBlock",
									"text":   "🔴 Task Overdue",
									"weight": "Bolder",
									"size":   "Large",
									"color":  "Attention",
								},
							},
						},
						{
							"type":    "TextBlock",
							"text":    "This task is overdue and requires immediate attention.",
							"wrap":    true,
							"spacing": "Medium",
						},
						{
							"type":    "FactSet",
							"facts":   facts,
							"spacing": "Medium",
						},
					},
				},
			},
		},
	}
}

// createGenericCard creates a generic Adaptive Card for any event
func (ws *WebhookService) createGenericCard(event models.WebhookEvent, data map[string]interface{}) map[string]interface{} {
	// Convert data to facts
	facts := []map[string]interface{}{}
	for key, value := range data {
		facts = append(facts, map[string]interface{}{
			"title": fmt.Sprintf("%s:", key),
			"value": fmt.Sprintf("%v", value),
		})
	}

	return map[string]interface{}{
		"type": "message",
		"attachments": []map[string]interface{}{
			{
				"contentType": "application/vnd.microsoft.card.adaptive",
				"content": map[string]interface{}{
					"type":    "AdaptiveCard",
					"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
					"version": "1.4",
					"body": []map[string]interface{}{
						{
							"type":  "Container",
							"style": "emphasis",
							"items": []map[string]interface{}{
								{
									"type":   "TextBlock",
									"text":   fmt.Sprintf("📢 %s", event),
									"weight": "Bolder",
									"size":   "Large",
								},
							},
						},
						{
							"type":    "TextBlock",
							"text":    "Event notification from goReporter",
							"wrap":    true,
							"spacing": "Medium",
						},
						{
							"type":    "FactSet",
							"facts":   facts,
							"spacing": "Medium",
						},
						{
							"type":    "TextBlock",
							"text":    fmt.Sprintf("Triggered at %s", time.Now().Format("Jan 2, 2006 3:04 PM")),
							"size":    "Small",
							"color":   "Accent",
							"spacing": "Medium",
						},
					},
				},
			},
		},
	}
}
