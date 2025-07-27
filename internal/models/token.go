package models

import (
    "time"

    "gorm.io/gorm"
)

type Token struct {
    gorm.Model
    Token     string    `gorm:"uniqueIndex"`
    UserID    uint      // Foreign key for User
    ExpiresAt time.Time
}