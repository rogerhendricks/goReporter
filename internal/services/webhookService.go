package services

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

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

	// Check if this is a Microsoft Teams webhook
	isTeams := ws.isTeamsWebhook(webhook.URL)

	var payloadBytes []byte
	var err error

	if isTeams {
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

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "goReporter-Webhook/1.0")
	req.Header.Set("X-Webhook-Event", string(event))
	req.Header.Set("X-Webhook-ID", fmt.Sprintf("%d", webhook.ID))

	// Add signature if secret is configured
	if webhook.Secret != "" {
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
