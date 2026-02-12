package services

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gofiber/websocket/v2"
)

// NotificationEvent is the payload sent over the websocket channels.
// Keep this minimal and stable for the UI.
type NotificationEvent struct {
	Type            string `json:"type"`
	Title           string `json:"title"`
	Message         string `json:"message"`
	Severity        string `json:"severity,omitempty"`
	ActionURL       string `json:"actionUrl,omitempty"`
	TaskID          *uint  `json:"taskId,omitempty"`
	ReportID        *uint  `json:"reportId,omitempty"`
	AccessRequestID *uint  `json:"accessRequestId,omitempty"`
	CompletedBy     string `json:"completedBy,omitempty"`
}

type NotificationHub struct {
	mu     sync.RWMutex
	admins map[*websocket.Conn]struct{}
	users  map[uint]map[*websocket.Conn]struct{}
}

func NewNotificationHub() *NotificationHub {
	return &NotificationHub{
		admins: make(map[*websocket.Conn]struct{}),
		users:  make(map[uint]map[*websocket.Conn]struct{}),
	}
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

func (h *NotificationHub) RegisterUser(userID uint, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.users[userID]; !ok {
		h.users[userID] = make(map[*websocket.Conn]struct{})
	}
	h.users[userID][conn] = struct{}{}
	fmt.Printf("[UserNotifications] User %d connected. Total connections for user: %d\n", userID, len(h.users[userID]))
}

func (h *NotificationHub) UnregisterUser(userID uint, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if conns, ok := h.users[userID]; ok {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(h.users, userID)
		}
	}
	fmt.Printf("[UserNotifications] User %d disconnected. Active users: %d\n", userID, len(h.users))
}

func (h *NotificationHub) BroadcastToAdmins(evt NotificationEvent) {
	payload, err := json.Marshal(evt)
	if err != nil {
		return
	}

	h.mu.RLock()
	conns := make([]*websocket.Conn, 0, len(h.admins))
	for conn := range h.admins {
		conns = append(conns, conn)
	}
	h.mu.RUnlock()

	fmt.Printf("[AdminNotifications] Broadcasting %s to %d admin(s): %s\n", evt.Type, len(conns), evt.Message)

	for _, conn := range conns {
		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			fmt.Printf("[AdminNotifications] Failed to send to admin: %v\n", err)
			h.UnregisterAdmin(conn)
			_ = conn.Close()
		}
	}
}

func (h *NotificationHub) SendToUser(userID uint, evt NotificationEvent) {
	payload, err := json.Marshal(evt)
	if err != nil {
		return
	}

	h.mu.RLock()
	userConnsMap, ok := h.users[userID]
	if !ok || len(userConnsMap) == 0 {
		h.mu.RUnlock()
		fmt.Printf("[UserNotifications] No active connections for user %d\n", userID)
		return
	}

	conns := make([]*websocket.Conn, 0, len(userConnsMap))
	for conn := range userConnsMap {
		conns = append(conns, conn)
	}
	h.mu.RUnlock()

	fmt.Printf("[UserNotifications] Sending %s to user %d across %d connection(s)\n", evt.Type, userID, len(conns))

	for _, conn := range conns {
		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			fmt.Printf("[UserNotifications] Failed to send to user %d: %v\n", userID, err)
			h.UnregisterUser(userID, conn)
			_ = conn.Close()
		}
	}
}

var NotificationsHub = NewNotificationHub()
