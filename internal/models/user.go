package models

import (
	"errors"
	"time"

	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/utils"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	MaxLoginAttempts = 5                // Maximum failed login attempts before locking
	LockoutDuration  = 15 * time.Minute // Account lockout duration
)

type User struct {
	gorm.Model
	Username            string     `json:"username" gorm:"type:varchar(255);uniqueIndex;not null"`
	Password            string     `json:"password" gorm:"type:varchar(255);not null"`
	Email               string     `json:"email" gorm:"type:varchar(255);uniqueIndex;not null"`
	Role                string     `json:"role" gorm:"type:varchar(50);not null"`
	FullName            string     `json:"fullName,omitempty" gorm:"type:varchar(100)"`                        // Optional full name
	ThemePreference     string     `json:"themePreference,omitempty" gorm:"type:varchar(50);default:'system'"` // User's preferred theme
	DoctorID            *uint      `json:"doctorId,omitempty" gorm:"index"`                                    // Link to doctor record for doctor role users
	Doctor              *Doctor    `json:"doctor,omitempty" gorm:"foreignKey:DoctorID"`                        // Belongs to doctor
	Reports             []Report   `json:"reports"`                                                            // Has many reports
	RefreshTokens       []Token    `json:"refresh_tokens"`
	FailedLoginAttempts int        `json:"-" gorm:"default:0"` // Track failed login attempts
	LockedUntil         *time.Time `json:"-" gorm:"index"`     // Has many tokens
}

func (u *User) TableName() string {
	return "users"
}

// IsLocked checks if the user account is currently locked
func (u *User) IsLocked() bool {
	if u.LockedUntil == nil {
		return false
	}
	return time.Now().Before(*u.LockedUntil)
}

// LockAccount locks the user account for the specified duration
func (u *User) LockAccount() error {
	lockUntil := time.Now().Add(LockoutDuration)
	u.LockedUntil = &lockUntil
	return config.DB.Model(u).Updates(map[string]interface{}{
		"locked_until": lockUntil,
	}).Error
}

// UnlockAccount unlocks the user account and resets failed login attempts
func (u *User) UnlockAccount() error {
	u.LockedUntil = nil
	u.FailedLoginAttempts = 0
	return config.DB.Model(u).Updates(map[string]interface{}{
		"locked_until":          nil,
		"failed_login_attempts": 0,
	}).Error
}

// IncrementFailedAttempts increments the failed login attempts counter
func (u *User) IncrementFailedAttempts() error {
	u.FailedLoginAttempts++

	// Lock account if max attempts reached
	if u.FailedLoginAttempts >= MaxLoginAttempts {
		return u.LockAccount()
	}

	return config.DB.Model(u).Update("failed_login_attempts", u.FailedLoginAttempts).Error
}

// ResetFailedAttempts resets the failed login attempts counter
func (u *User) ResetFailedAttempts() error {
	u.FailedLoginAttempts = 0
	return config.DB.Model(u).Update("failed_login_attempts", 0).Error
}

// Database instance - you'll need to initialize this in your main.go
// var DB *gorm.DB

// GetUserByID retrieves a user by their ID
func GetUserByID(userID string) (*User, error) {
	var user User
	err := config.DB.Where("id = ?", userID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUsername returns the username of the user
func (u *User) GetUsername() string {
	return u.Username
}

// GetUserByUsername retrieves a user by their username
func GetUserByUsername(username string) (*User, error) {
	var user User
	err := config.DB.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByEmail retrieves a user by their email
func GetUserByEmail(email string) (*User, error) {
	var user User
	err := config.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByFullName retrieves a user by their full name
func GetUserByFullName(fullName string) (*User, error) {
	var user User
	err := config.DB.Where("full_name = ?", fullName).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// CreateUser creates a new user
func CreateUser(user *User) error {
	return config.DB.Create(user).Error
}

// UpdateUser updates an existing user
func UpdateUser(user *User) error {
	return config.DB.Save(user).Error
}

// DeleteUser deletes a user by ID
func DeleteUser(userID string) error {
	return config.DB.Delete(&User{}, userID).Error
}

// GetAllUsers retrieves all users (admin only)
func GetAllUsers() ([]User, error) {
	var users []User
	if err := config.DB.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// CheckUserExists checks if a user exists by ID
func CheckUserExists(userID string) (bool, error) {
	var count int64
	err := config.DB.Model(&User{}).Where("id = ?", userID).Count(&count).Error
	return count > 0, err
}

func HashPassword(password string) (string, error) {
	// Validate password complexity before hashing
	if err := utils.ValidatePasswordComplexity(password); err != nil {
		return "", err
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedBytes), nil
}

// CheckPassword verifies a password against its hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GetUserWithDoctor retrieves a user by ID with doctor relationship loaded
func GetUserWithDoctor(userID string) (*User, error) {
	var user User
	err := config.DB.Preload("Doctor").Where("id = ?", userID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetPatientsForDoctor retrieves all patients associated with a doctor user
func GetPatientsForDoctor(userID string) ([]Patient, error) {
	user, err := GetUserWithDoctor(userID)
	if err != nil {
		return nil, err
	}

	if user.Role != "doctor" || user.DoctorID == nil {
		return nil, errors.New("user is not a doctor or not linked to a doctor record")
	}

	var patients []Patient
	err = config.DB.Preload("ImplantedDevices.Device").
		Preload("ImplantedLeads.Lead").
		Preload("PatientDoctors.Doctor.Addresses").
		Preload("PatientDoctors.Address").
		Preload("Reports").
		Preload("Medications").
		Joins("JOIN patient_doctors ON patient_doctors.patient_id = patients.id").
		Where("patient_doctors.doctor_id = ?", *user.DoctorID).
		Find(&patients).Error

	return patients, err
}

// CanDoctorAccessPatient checks if a doctor user can access a specific patient
func CanDoctorAccessPatient(userID string, patientID uint) (bool, error) {
	user, err := GetUserWithDoctor(userID)
	if err != nil {
		return false, err
	}

	if user.Role != "doctor" || user.DoctorID == nil {
		return false, nil
	}

	var count int64
	err = config.DB.Model(&PatientDoctor{}).
		Where("patient_id = ? AND doctor_id = ?", patientID, *user.DoctorID).
		Count(&count).Error

	return count > 0, err
}
