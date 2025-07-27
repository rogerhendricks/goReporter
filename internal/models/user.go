package models

import (
    "github.com/rogerhendricks/goReporter/internal/config"
    "gorm.io/gorm"
    "golang.org/x/crypto/bcrypt"
    "errors"
)

type User struct {
    gorm.Model
    Username string `json:"username" gorm:"type:varchar(255);uniqueIndex;not null"`
    Password string `json:"password" gorm:"type:varchar(255);not null"`
    Email    string `json:"email" gorm:"type:varchar(255);uniqueIndex;not null"`
    Role     string `json:"role" gorm:"type:varchar(50);not null"`
    Reports       []Report `json:"reports"`       // Has many reports
    RefreshTokens []Token  `json:"refresh_tokens"` // Has many tokens
}

func (u *User) TableName() string {
    return "users"
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
    err := config.DB.Find(&users).Error
    return users, err
}

// CheckUserExists checks if a user exists by ID
func CheckUserExists(userID string) (bool, error) {
    var count int64
    err := config.DB.Model(&User{}).Where("id = ?", userID).Count(&count).Error
    return count > 0, err
}

func HashPassword(password string) (string, error) {
    if len(password) < 8 {
        return "", errors.New("password must be at least 8 characters long")
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