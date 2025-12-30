package models

import (
	"strings"

	"github.com/rogerhendricks/goReporter/internal/config"
	"gorm.io/gorm"
)

type Device struct {
	gorm.Model
	Name         string            `json:"name" gorm:"type:varchar(255);not null"`
	Manufacturer string            `json:"manufacturer" gorm:"type:text"`
	DevModel     string            `json:"model" gorm:"type:varchar(100)"`
	IsMri        bool              `json:"isMri" gorm:"default:false"`
	Type         string            `json:"type" gorm:"type:varchar(100)"`
	Implanted    []ImplantedDevice `json:"implanted" gorm:"foreignKey:DeviceID"`
}

// GetAllDevices retrieves all devices
func GetAllDevices() ([]Device, error) {
	var devices []Device
	err := config.DB.Find(&devices).Error
	if err != nil {
		return []Device{}, err // Return empty slice instead of nil
	}
	return devices, nil
}

// Get all devices matching search
func GetAllDevicesBySearch(query string) ([]Device, error) {
	var devices []Device
	tx := config.DB

	if query != "" {
		searchQuery := "%" + strings.ToLower(query) + "%"
		tx = tx.Where("LOWER(name) LIKE ? OR LOWER(manufacturer) LIKE ? OR LOWER(dev_model) LIKE ?", searchQuery, searchQuery, searchQuery)
	}

	err := tx.Find(&devices).Error
	if err != nil {
		return []Device{}, err // Return empty slice instead of nil
	}
	return devices, nil
}

// GetDeviceByID retrieves a device by ID
func GetDeviceByID(deviceID uint) (*Device, error) {
	var device Device
	err := config.DB.First(&device, deviceID).Error
	if err != nil {
		return nil, err
	}
	return &device, nil
}

// CreateDevice creates a new device
func CreateDevice(device *Device) error {
	return config.DB.Create(device).Error
}

// UpdateDevice updates an existing device
func UpdateDevice(device *Device) error {
	return config.DB.Save(device).Error
}

// DeleteDevice deletes a device by ID
func DeleteDevice(deviceID uint) error {
	return config.DB.Delete(&Device{}, deviceID).Error
}

// DeviceHasImplantedDevices checks if device has any implanted instances
func DeviceHasImplantedDevices(deviceID uint) (bool, error) {
	var count int64
	err := config.DB.Model(&ImplantedDevice{}).Where("device_id = ?", deviceID).Count(&count).Error
	return count > 0, err
}

// GetDevicesPaginated retrieves devices with pagination and search
func GetDevicesPaginated(search string, page, limit int) ([]Device, int64, error) {
	var devices []Device
	var total int64

	tx := config.DB.Model(&Device{})

	// Apply search filter if provided
	if search != "" {
		searchQuery := "%" + strings.ToLower(search) + "%"
		tx = tx.Where("LOWER(name) LIKE ? OR LOWER(manufacturer) LIKE ? OR LOWER(dev_model) LIKE ?",
			searchQuery, searchQuery, searchQuery)
	}

	// Get total count
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * limit
	err := tx.Offset(offset).Limit(limit).Order("name ASC").Find(&devices).Error
	if err != nil {
		return nil, 0, err
	}

	return devices, total, nil
}
