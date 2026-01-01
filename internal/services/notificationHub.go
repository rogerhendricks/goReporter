package services

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gofiber/websocket/v2"
)

// NotificationEvent is the payload sent to admins over the WS.
// Keep this minimal and stable for the UI.
type NotificationEvent struct {
	Type        string `json:"type"`
	Title       string `json:"title"`
	Message     string `json:"message"`
	TaskID      *uint  `json:"taskId,omitempty"`
	ReportID    *uint  `json:"reportId,omitempty"`
	CompletedBy string `json:"completedBy,omitempty"`
}

type NotificationHub struct {
	mu     sync.Mutex
	admins map[*websocket.Conn]struct{}
}

func NewNotificationHub() *NotificationHub {
	return &NotificationHub{admins: make(map[*websocket.Conn]struct{})}
}

func (h *NotificationHub) RegisterAdmin(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.admins[conn] = struct{}{}
	fmt.Printf("[AdminNotifications] Admin connected. Total: %d\n", len(h.admins))
}

func (h *NotificationHub) UnregisterAdmin(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.admins, conn)
	fmt.Printf("[AdminNotifications] Admin disconnected. Total: %d\n", len(h.admins))
}

func (h *NotificationHub) BroadcastToAdmins(evt NotificationEvent) {
	payload, err := json.Marshal(evt)
	if err != nil {
		return
	}

	h.mu.Lock()
	conns := make([]*websocket.Conn, 0, len(h.admins))
	for conn := range h.admins {
		conns = append(conns, conn)
	}
	h.mu.Unlock()

	fmt.Printf("[AdminNotifications] Broadcasting %s to %d admin(s): %s\n", evt.Type, len(conns), evt.Message)

	for _, conn := range conns {
		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			fmt.Printf("[AdminNotifications] Failed to send to admin: %v\n", err)
			h.UnregisterAdmin(conn)
			_ = conn.Close()
		}
	}
}

var AdminNotificationsHub = NewNotificationHub()
