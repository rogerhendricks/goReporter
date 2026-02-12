package models

import (
	"strings"

	"github.com/rogerhendricks/goReporter/internal/config"
	"gorm.io/gorm"
)

type Doctor struct {
	gorm.Model
	UserID    *uint     `json:"userId" gorm:"uniqueIndex"` // Link to the User model
	FullName  string    `json:"fullName" gorm:"type:varchar(100);not null"`
	Email     string    `json:"email" gorm:"type:varchar(255);uniqueIndex"`
	Phone     string    `json:"phone" gorm:"type:varchar(20)"`
	Specialty string    `json:"specialty" gorm:"type:varchar(100)"`
	Password  string    `json:"-" gorm:"-"` // Added for user creation
	Addresses []Address `json:"addresses" gorm:"foreignKey:DoctorID;constraint:OnDelete:CASCADE"`
	Reports   []Report  `json:"reports"`
}

// GetAllDoctors retrieves all doctors with their addresses (excluding soft-deleted)
func GetAllDoctors() ([]Doctor, error) {
	var doctors []Doctor
	// Explicitly exclude soft-deleted doctors and addresses
	err := config.DB.Preload("Addresses", "deleted_at IS NULL").Where("deleted_at IS NULL").Find(&doctors).Error
	if err != nil {
		return []Doctor{}, err // Return empty slice instead of nil
	}
	return doctors, err
}

// GetAllDoctorsBySearch retrieves doctors matching search criteria
func GetAllDoctorsBySearch(query string) ([]Doctor, error) {
	var doctors []Doctor
	tx := config.DB.Preload("Addresses", "deleted_at IS NULL").Where("deleted_at IS NULL")

	if query != "" {
		searchQuery := "%" + query + "%"
		tx = tx.Where("full_name LIKE ? OR email LIKE ? OR specialty LIKE ?", searchQuery, searchQuery, searchQuery)
	}

	err := tx.Find(&doctors).Error
	if err != nil {
		return []Doctor{}, err // Return empty slice instead of nil
	}
	return doctors, nil
}

// GetDoctorByID retrieves a doctor by ID with addresses
func GetDoctorByID(doctorID uint) (*Doctor, error) {
	var doctor Doctor
	err := config.DB.Preload("Addresses").First(&doctor, doctorID).Error
	if err != nil {
		return nil, err
	}
	return &doctor, nil
}

// CreateDoctor creates a new doctor with addresses
func CreateDoctor(doctor *Doctor) error {
	return config.DB.Create(doctor).Error
}

// CreateDoctorWithUser creates a new doctor and an associated user
func CreateDoctorWithUser(doctor *Doctor, password string, username string) error {
	tx := config.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. Create the user
	user := &User{
		Username: username,
		Email:    doctor.Email,
		FullName: doctor.FullName,
		Role:     "doctor",
	}

	hashedPassword, err := HashPassword(password)
	if err != nil {
		tx.Rollback()
		return err
	}
	user.Password = hashedPassword

	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 2. Link user to doctor and create the doctor
	doctor.UserID = &user.ID
	if err := tx.Create(doctor).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 3. Update user with DoctorID
	user.DoctorID = &doctor.ID
	if err := tx.Save(user).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// UpdateDoctor updates an existing doctor
func UpdateDoctor(doctor *Doctor) error {
	return config.DB.Save(doctor).Error
}

// DeleteDoctor deletes a doctor by ID
func DeleteDoctor(doctorID uint) error {
	tx := config.DB.Begin()

	// First, soft delete all addresses associated with this doctor
	if err := tx.Where("doctor_id = ?", doctorID).Delete(&Address{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Then soft delete the doctor
	if err := tx.Delete(&Doctor{}, doctorID).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// DoctorHasReports checks if doctor has any reports
func DoctorHasReports(doctorID uint) (bool, error) {
	var count int64
	err := config.DB.Model(&Report{}).Where("doctor_id = ?", doctorID).Count(&count).Error
	return count > 0, err
}

// DoctorHasPatients checks if doctor has any associated patients
func DoctorHasPatients(doctorID uint) (bool, error) {
	var count int64
	err := config.DB.Model(&PatientDoctor{}).Where("doctor_id = ?", doctorID).Count(&count).Error
	return count > 0, err
}

// UpdateDoctorAddresses updates doctor's addresses
func UpdateDoctorAddresses(doctorID uint, addresses []Address) error {
	// Start transaction
	tx := config.DB.Begin()

	// Delete existing addresses
	if err := tx.Unscoped().Where("doctor_id = ?", doctorID).Delete(&Address{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Add new addresses
	// for i := range addresses {
	//     addresses[i].DoctorID = doctorID
	//     if err := tx.Create(&addresses[i]).Error; err != nil {
	//         tx.Rollback()
	//         return err
	//     }
	// }

	// Create clean address objects without IDs
	for _, addr := range addresses {
		newAddress := Address{
			Street:   addr.Street,
			City:     addr.City,
			State:    addr.State,
			Zip:      addr.Zip,
			DoctorID: doctorID,
		}

		if err := tx.Create(&newAddress).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}

// GetDoctorsPaginated retrieves doctors with pagination and search
func GetDoctorsPaginated(search string, page, limit int) ([]Doctor, int64, error) {
	var doctors []Doctor
	var total int64

	// Explicitly exclude soft-deleted doctors and addresses
	tx := config.DB.Model(&Doctor{}).Preload("Addresses", "deleted_at IS NULL").Where("doctors.deleted_at IS NULL")

	// Apply search filter if provided
	if search != "" {
		searchQuery := "%" + strings.ToLower(search) + "%"
		tx = tx.Where("LOWER(full_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(specialty) LIKE ?",
			searchQuery, searchQuery, searchQuery)
	}

	// Get total count
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * limit
	err := tx.Offset(offset).Limit(limit).Order("full_name ASC").Find(&doctors).Error
	if err != nil {
		return nil, 0, err
	}

	return doctors, total, nil
}
