package config

import (
    "log"
    "os"

    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

var DB *gorm.DB

// ConnectDatabase connects to the database.
func ConnectDatabase() {
    var err error
    // For a production app, you should get the DSN from an environment variable.
    dsn := "reporter.db"
    DB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),
    })

    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
        os.Exit(2)
    }

    log.Println("Database connection successfully opened.")
}