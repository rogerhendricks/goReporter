package handlers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/websocket/v2"
	"github.com/rogerhendricks/goReporter/internal/services"
)

// AdminNotificationsWS is a websocket endpoint for admin-only notifications.
// NOTE: Route should be protected by middleware.RequireAdmin.
func AdminNotificationsWS(conn *websocket.Conn) {
	services.NotificationsHub.RegisterAdmin(conn)
	defer services.NotificationsHub.UnregisterAdmin(conn)
	defer func() { _ = conn.Close() }()

	keepConnectionAlive(conn)
}

// UserNotificationsWS allows authenticated (non-admin) users to receive their own notifications.
func UserNotificationsWS(conn *websocket.Conn) {
	userIDVal := conn.Locals("user_id")
	userID, _ := userIDVal.(uint)
	if userID == 0 {
		if strID, ok := conn.Locals("userID").(string); ok {
			if parsed, err := strconv.ParseUint(strID, 10, 64); err == nil {
				userID = uint(parsed)
			}
		}
	}

	if userID == 0 {
		fmt.Println("[UserNotifications] Missing user_id on websocket connection; closing")
		_ = conn.Close()
		return
	}

	services.NotificationsHub.RegisterUser(userID, conn)
	defer services.NotificationsHub.UnregisterUser(userID, conn)
	defer func() { _ = conn.Close() }()

	keepConnectionAlive(conn)
}

func keepConnectionAlive(conn *websocket.Conn) {
	conn.SetReadDeadline(time.Time{})
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}
