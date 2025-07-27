package handlers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/rogerhendricks/goReporter/internal/models"
    "net/http"
    "log"
    "strings"
    "html"
    "errors"
    "gorm.io/gorm"
    "strconv"
)

// GetDevices retrieves all devices
func GetDevices(c *fiber.Ctx) error {
    // Check if user has admin role for full access
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
    }

    devices, err := models.GetAllDevices()
    if err != nil {
        log.Printf("Error fetching devices: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch devices"})
    }

    return c.JSON(devices)
}

// GetDevicesBasic retrieves basic device information (name, manufacturer, type, model)
func GetDevicesBasic(c *fiber.Ctx) error {
    log.Printf("GetDevicesBasic handler called") // Add this debug line
    
    // Check if user is authenticated (no admin requirement)
    userID := c.Locals("userID").(string)
    log.Printf("User ID from context: %s", userID) // Add this debug line
    
    _, err := models.GetUserByID(userID)
    if err != nil {
        log.Printf("User authentication failed: %v", err) // Add this debug line
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
    }

    devices, err := models.GetAllDevices()
    if err != nil {
        log.Printf("Error fetching devices: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch devices"})
    }

    log.Printf("Found %d devices in database", len(devices)) // Add this debug line

    // Ensure we return an empty array if no devices
    if devices == nil {
        log.Printf("Devices is nil, returning empty array") // Add this debug line
        return c.JSON([]interface{}{})
    }

    if len(devices) == 0 {
        log.Printf("No devices found, returning empty array") // Add this debug line
        return c.JSON([]interface{}{})
    }

    // Create a simplified response with consistent field names
    type DeviceBasic struct {
        ID           uint   `json:"id"`
        Name         string `json:"name"`
        Manufacturer string `json:"manufacturer"`
        Type         string `json:"type"`
        Model        string `json:"model"`
        IsMri        bool   `json:"isMri"`
    }

    var basicDevices []DeviceBasic
    for _, device := range devices {
        basicDevices = append(basicDevices, DeviceBasic{
            ID:           device.ID,
            Name:         device.Name,
            Manufacturer: device.Manufacturer,
            Type:         device.Type,
            Model:        device.DevModel,
            IsMri:        device.IsMri,
        })
    }

    log.Printf("Returning %d basic devices", len(basicDevices)) // Add this debug line
    return c.JSON(basicDevices)
}

// GetDevice retrieves a specific device by ID
func GetDevice(c *fiber.Ctx) error {
    deviceID := c.Params("id")
    
    // Validate ID format
    id, err := strconv.ParseUint(deviceID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid device ID format"})
    }

    device, err := models.GetDeviceByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Device not found"})
        }
        log.Printf("Error fetching device %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    return c.JSON(device)
}

// CreateDevice creates a new device
func CreateDevice(c *fiber.Ctx) error {
    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }

    var newDevice models.Device
    if err := c.BodyParser(&newDevice); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }

    // Validate input
    if err := validateDevice(&newDevice); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // Sanitize input
    newDevice.Name = html.EscapeString(strings.TrimSpace(newDevice.Name))
    newDevice.Manufacturer = html.EscapeString(strings.TrimSpace(newDevice.Manufacturer))
    newDevice.DevModel = html.EscapeString(strings.TrimSpace(newDevice.DevModel))
    newDevice.Type = html.EscapeString(strings.TrimSpace(newDevice.Type))

    // Create device in database
    if err := models.CreateDevice(&newDevice); err != nil {
        log.Printf("Error creating device: %v", err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create device"})
    }

    return c.Status(http.StatusCreated).JSON(newDevice)
}

// UpdateDevice updates an existing device
func UpdateDevice(c *fiber.Ctx) error {
    deviceID := c.Params("id")
    
    // Validate ID format
    id, err := strconv.ParseUint(deviceID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid device ID format"})
    }

    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }

    var updateData models.Device
    if err := c.BodyParser(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
    }

    // Get existing device
    existingDevice, err := models.GetDeviceByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Device not found"})
        }
        log.Printf("Error fetching device %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    // Validate input
    if err := validateDeviceUpdate(&updateData); err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // Update fields if provided
    if updateData.Name != "" {
        existingDevice.Name = html.EscapeString(strings.TrimSpace(updateData.Name))
    }
    if updateData.Manufacturer != "" {
        existingDevice.Manufacturer = html.EscapeString(strings.TrimSpace(updateData.Manufacturer))
    }
    if updateData.DevModel != "" {
        existingDevice.DevModel = html.EscapeString(strings.TrimSpace(updateData.DevModel))
    }
    if updateData.Type != "" {
        existingDevice.Type = html.EscapeString(strings.TrimSpace(updateData.Type))
    }
    // Update boolean field
    existingDevice.IsMri = updateData.IsMri

    if err := models.UpdateDevice(existingDevice); err != nil {
        log.Printf("Error updating device %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update device"})
    }

    return c.JSON(existingDevice)
}

// DeleteDevice removes a device
func DeleteDevice(c *fiber.Ctx) error {
    deviceID := c.Params("id")
    
    // Validate ID format
    id, err := strconv.ParseUint(deviceID, 10, 32)
    if err != nil {
        return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid device ID format"})
    }

    // Check admin permissions
    userID := c.Locals("userID").(string)
    user, err := models.GetUserByID(userID)
    if err != nil || user.Role != "admin" {
        return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
    }

    // Check if device exists
    _, err = models.GetDeviceByID(uint(id))
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Device not found"})
        }
        log.Printf("Error fetching device %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }

    // Check if device is being used (has implanted devices)
    hasImplanted, err := models.DeviceHasImplantedDevices(uint(id))
    if err != nil {
        log.Printf("Error checking implanted devices for device %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
    }
    
    if hasImplanted {
        return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "Cannot delete device that has implanted instances"})
    }

    if err := models.DeleteDevice(uint(id)); err != nil {
        log.Printf("Error deleting device %d: %v", id, err)
        return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete device"})
    }

    return c.SendStatus(http.StatusNoContent)
}

// validateDevice validates device creation input
func validateDevice(device *models.Device) error {
    if strings.TrimSpace(device.Name) == "" {
        return errors.New("device name is required")
    }
    
    if len(strings.TrimSpace(device.Name)) > 255 {
        return errors.New("device name must be less than 255 characters")
    }
    
    if device.DevModel != "" && len(strings.TrimSpace(device.DevModel)) > 100 {
        return errors.New("device model must be less than 100 characters")
    }
    
    if device.Type != "" && len(strings.TrimSpace(device.Type)) > 100 {
        return errors.New("device type must be less than 100 characters")
    }
    
    return nil
}

// validateDeviceUpdate validates device update input
func validateDeviceUpdate(device *models.Device) error {
    if device.Name != "" {
        if len(strings.TrimSpace(device.Name)) > 255 {
            return errors.New("device name must be less than 255 characters")
        }
    }
    
    if device.DevModel != "" && len(strings.TrimSpace(device.DevModel)) > 100 {
        return errors.New("device model must be less than 100 characters")
    }
    
    if device.Type != "" && len(strings.TrimSpace(device.Type)) > 100 {
        return errors.New("device type must be less than 100 characters")
    }
    
    return nil
}