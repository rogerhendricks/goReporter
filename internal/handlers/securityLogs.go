package handlers

import (
    "bufio"
    "encoding/csv"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
    "strconv"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/security"
)

func GetSecurityLogs(c *fiber.Ctx) error {
    // Parse query parameters
    page, _ := strconv.Atoi(c.Query("page", "1"))
    limit, _ := strconv.Atoi(c.Query("limit", "50"))
    eventType := c.Query("eventType")
    severity := c.Query("severity")
    userId := c.Query("userId")

    // Read today's log file
    filename := "logs/security_" + time.Now().Format("2006-01-02") + ".log"
    file, err := os.Open(filename)
    if err != nil {
        return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Log file not found"})
    }
    defer file.Close()

    var logs []security.SecurityEvent
    scanner := bufio.NewScanner(file)
    
    // Increase buffer size for large log entries
    const maxCapacity = 1024 * 1024 // 1MB
    buf := make([]byte, maxCapacity)
    scanner.Buffer(buf, maxCapacity)
    
    for scanner.Scan() {
        var event security.SecurityEvent
        if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
            continue
        }

        // Apply filters
        if eventType != "" && string(event.EventType) != eventType {
            continue
        }
        if severity != "" && event.Severity != severity {
            continue
        }
        if userId != "" && event.UserID != userId {
            continue
        }

        logs = append(logs, event)
    }

    if err := scanner.Err(); err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Error reading log file",
        })
    }

    // Reverse to show newest first
    for i, j := 0, len(logs)-1; i < j; i, j = i+1, j-1 {
        logs[i], logs[j] = logs[j], logs[i]
    }

    // Pagination
    start := (page - 1) * limit
    end := start + limit
    if start >= len(logs) {
        return c.JSON(fiber.Map{
            "logs":  []security.SecurityEvent{},
            "total": len(logs),
            "page":  page,
            "limit": limit,
        })
    }
    if end > len(logs) {
        end = len(logs)
    }

    return c.JSON(fiber.Map{
        "logs":  logs[start:end],
        "total": len(logs),
        "page":  page,
        "limit": limit,
    })
}

func ExportSecurityLogs(c *fiber.Ctx) error {
    // Parse query parameters for filtering
    eventType := c.Query("eventType")
    severity := c.Query("severity")
    userId := c.Query("userId")

    // Read today's log file
    filename := "logs/security_" + time.Now().Format("2006-01-02") + ".log"
    file, err := os.Open(filename)
    if err != nil {
        return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Log file not found"})
    }
    defer file.Close()

    var logs []security.SecurityEvent
    scanner := bufio.NewScanner(file)
    
    // Increase buffer size for large log entries
    const maxCapacity = 1024 * 1024 // 1MB
    buf := make([]byte, maxCapacity)
    scanner.Buffer(buf, maxCapacity)
    
    for scanner.Scan() {
        var event security.SecurityEvent
        if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
            continue
        }

        // Apply filters
        if eventType != "" && string(event.EventType) != eventType {
            continue
        }
        if severity != "" && event.Severity != severity {
            continue
        }
        if userId != "" && event.UserID != userId {
            continue
        }

        logs = append(logs, event)
    }

    if err := scanner.Err(); err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Error reading log file",
        })
    }

    // Set response headers for CSV download
    c.Set("Content-Type", "text/csv")
    c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=security-logs-%s.csv", time.Now().Format("2006-01-02-150405")))

    // Create CSV writer
    writer := csv.NewWriter(c.Response().BodyWriter())
    defer writer.Flush()

    // Write CSV header
    header := []string{"Timestamp", "Event Type", "Severity", "User ID", "Username", "IP Address", "User Agent", "Path", "Method", "Status Code", "Message"}
    if err := writer.Write(header); err != nil {
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
            "error": "Error writing CSV header",
        })
    }

    // Write log entries
    for _, log := range logs {
        row := []string{
            log.Timestamp.Format("2006-01-02 15:04:05"),
            string(log.EventType),
            log.Severity,
            log.UserID,
            log.Username,
            log.IPAddress,
            log.UserAgent,
            log.Path,
            log.Method,
            strconv.Itoa(log.StatusCode),
            log.Message,
        }
        if err := writer.Write(row); err != nil {
            return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
                "error": "Error writing CSV row",
            })
        }
    }

    return nil
}