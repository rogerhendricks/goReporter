// internal/models/token.go
package models

import (
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/rogerhendricks/goReporter/internal/config"
	"gorm.io/gorm"
)

type Token struct {
	gorm.Model
	Token     string    `gorm:"uniqueIndex;not null"`
	UserID    uint      `gorm:"not null;index"`
	ExpiresAt time.Time `gorm:"not null;index"`
	Revoked   bool      `gorm:"default:false;index"`
	User      User      `gorm:"foreignKey:UserID"`
}

// GenerateRefreshToken creates a secure random refresh token
func GenerateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// CreateRefreshToken stores a new refresh token in the database and returns the record
func CreateRefreshToken(userID uint, tokenString string, expiresAt time.Time) (*Token, error) {
	token := Token{
		Token:     tokenString,
		UserID:    userID,
		ExpiresAt: expiresAt,
		Revoked:   false,
	}

	if err := config.DB.Create(&token).Error; err != nil {
		return nil, err
	}

	return &token, nil
}

// ValidateRefreshToken checks if a refresh token is valid
func ValidateRefreshToken(tokenString string) (*Token, error) {
	var token Token
	err := config.DB.Where("token = ? AND revoked = ? AND expires_at > ?",
		tokenString, false, time.Now()).First(&token).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

// RevokeRefreshToken marks a token as revoked
func RevokeRefreshToken(tokenString string) error {
	return config.DB.Model(&Token{}).
		Where("token = ?", tokenString).
		Update("revoked", true).Error
}

// RevokeAllUserTokens revokes all tokens for a user
func RevokeAllUserTokens(userID uint) error {
	return config.DB.Model(&Token{}).
		Where("user_id = ? AND revoked = ?", userID, false).
		Update("revoked", true).Error
}

// CleanupExpiredTokens removes expired tokens from the database
func CleanupExpiredTokens() error {
	return config.DB.Where("expires_at < ?", time.Now()).
		Delete(&Token{}).Error
}
