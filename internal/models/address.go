package models
import (
    "github.com/rogerhendricks/goReporter/internal/config"
    "gorm.io/gorm"
)

type Address struct {
    gorm.Model
    Street   string `json:"street" gorm:"type:varchar(255);not null"`
    City     string `json:"city" gorm:"type:varchar(100);not null"`
    State    string `json:"state" gorm:"type:varchar(100);not null"`
    Country  string `json:"country" gorm:"type:varchar(100);not null"`
    Zip      string `json:"zip" gorm:"type:varchar(20);not null"`
    DoctorID uint   `json:"doctor_id"`
}

// GetAddressesByDoctorID retrieves all addresses for a doctor
func GetAddressesByDoctorID(doctorID uint) ([]Address, error) {
    var addresses []Address
    err := config.DB.Where("doctor_id = ?", doctorID).Find(&addresses).Error
    return addresses, err
}

// CreateAddress creates a new address
func CreateAddress(address *Address) error {
    return config.DB.Create(address).Error
}

// UpdateAddress updates an existing address
func UpdateAddress(address *Address) error {
    return config.DB.Save(address).Error
}

// DeleteAddress deletes an address by ID
func DeleteAddress(addressID uint) error {
    return config.DB.Delete(&Address{}, addressID).Error
}