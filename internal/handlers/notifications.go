package handlers

import (
	"time"

	"github.com/gofiber/websocket/v2"
	"github.com/rogerhendricks/goReporter/internal/services"
)

// AdminNotificationsWS is a websocket endpoint for admin-only notifications.
// NOTE: Route should be protected by middleware.RequireAdmin.
func AdminNotificationsWS(conn *websocket.Conn) {
	services.AdminNotificationsHub.RegisterAdmin(conn)
	defer services.AdminNotificationsHub.UnregisterAdmin(conn)
	defer func() { _ = conn.Close() }()

	// Read loop so the connection stays open and we can detect disconnects.
	// We don't currently process any client messages.
	conn.SetReadDeadline(time.Time{})
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}
