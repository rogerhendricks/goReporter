package middleware

import (
    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/security"
    "strings"
)

// SecurityLoggerMiddleware logs security-relevant requests
func SecurityLoggerMiddleware(c *fiber.Ctx) error {
    // Log sensitive operations
    path := c.Path()
    method := c.Method()
    
    // Skip logging for public paths and static files
    if strings.HasPrefix(path, "/assets/") ||
       strings.HasPrefix(path, "/api/files/") ||
       path == "/" ||
       path == "/index.html" ||
       path == "/api/csrf-token" {
        return c.Next()
    }

    // Track data access patterns
    if method == "GET" && isSensitiveEndpoint(path) {
        security.LogEventFromContext(c, security.EventDataAccess, 
            "Sensitive data accessed", 
            "INFO", 
            map[string]interface{}{
                "endpoint": path,
            })
    }
    
    // Track data modifications
    if method == "PUT" || method == "POST" {
        security.LogEventFromContext(c, security.EventDataModification, 
            "Data modified", 
            "INFO", 
            map[string]interface{}{
                "endpoint": path,
                "method": method,
            })
    }
    
    // Track deletions
    if method == "DELETE" {
        security.LogEventFromContext(c, security.EventDataDeletion, 
            "Data deleted", 
            "WARNING", 
            map[string]interface{}{
                "endpoint": path,
            })
    }
    
    return c.Next()
}

func isSensitiveEndpoint(path string) bool {
    sensitivePatterns := []string{
        "/api/patients",
        "/api/reports",
        "/api/users",
        "/api/tasks",
    }
    
    for _, pattern := range sensitivePatterns {
        if len(path) >= len(pattern) && path[:len(pattern)] == pattern {
            return true
        }
    }
    return false
}