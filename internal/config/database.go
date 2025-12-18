package config

// import (
//     "fmt"
//     "log"
//     "os"
//     "time"

//     "github.com/rogerhendricks/goReporter/internal/models"
//     "gorm.io/driver/postgres"
//     "gorm.io/driver/sqlite"
//     "gorm.io/gorm"
//     "gorm.io/gorm/logger"
// )

// var DB *gorm.DB

// type DBConfig struct {
//     Host     string
//     Port     string
//     User     string
//     Password string
//     DBName   string
//     SSLMode  string
// }

// // ConnectDatabase connects to the database based on environment
// func ConnectDatabase() {
//     var err error
//     var dialector gorm.Dialector

//     // Get environment
//     env := os.Getenv("APP_ENV")
//     if env == "" {
//         env = "development"
//     }

//     // Configure GORM logger
//     gormLogger := logger.New(
//         log.New(os.Stdout, "\r\n", log.LstdFlags),
//         logger.Config{
//             SlowThreshold:             time.Second,
//             LogLevel:                  logger.Info,
//             IgnoreRecordNotFoundError: true,
//             Colorful:                  true,
//         },
//     )

//     // Choose database driver based on environment
//     if env == "production" {
//         log.Println("Connecting to PostgreSQL database (production)...")
//         dialector = getPostgresDialector()
//     } else {
//         log.Println("Connecting to SQLite database (development)...")
//         dialector = getSQLiteDialector()
//     }

//     // Open database connection with GORM
//     DB, err = gorm.Open(dialector, &gorm.Config{
//         Logger: gormLogger,
//     })
//     if err != nil {
//         log.Fatalf("Failed to connect to database: %v", err)
//     }

//     // Get underlying SQL DB for connection pool settings
//     sqlDB, err := DB.DB()
//     if err != nil {
//         log.Fatalf("Failed to get database instance: %v", err)
//     }

//     // Set connection pool settings
//     if env == "production" {
//         sqlDB.SetMaxIdleConns(10)
//         sqlDB.SetMaxOpenConns(100)
//         sqlDB.SetConnMaxLifetime(time.Hour)
//     } else {
//         sqlDB.SetMaxIdleConns(5)
//         sqlDB.SetMaxOpenConns(10)
//     }

//     log.Println("Database connection successfully opened.")

//     // Auto-migrate all models using GORM
//     err = DB.AutoMigrate(
// 		&models.User{},
// 		&models.Token{},
// 		&models.Doctor{},
// 		&models.Address{},
// 		&models.Device{},
// 		&models.Lead{},
// 		&models.Patient{},
// 		&models.PatientConsent{},
// 		&models.Medication{},
// 		&models.PatientDoctor{},
// 		&models.ImplantedDevice{},
// 		&models.ImplantedLead{},
// 		&models.Report{},
// 		&models.Tag{},
// 		&models.Task{},
// 		&models.TaskNote{},
// 		&models.TaskTemplate{},
//     )
//     if err != nil {
//         log.Fatalf("Failed to migrate database: %v", err)
//     }

//     log.Println("Database migrated successfully using GORM.")

//     // Enable pgcrypto extension for PostgreSQL (for encryption at rest)
//     if env == "production" {
//         if err := enablePgCrypto(); err != nil {
//             log.Printf("Warning: Failed to enable pgcrypto extension: %v", err)
//         } else {
//             log.Println("pgcrypto extension enabled successfully.")
//         }
//     }
// }

// // getSQLiteDialector returns GORM SQLite dialector
// func getSQLiteDialector() gorm.Dialector {
//     dbPath := os.Getenv("SQLITE_DB_PATH")
//     if dbPath == "" {
//         dbPath = "./reporter.db"
//     }
//     return sqlite.Open(dbPath)
// }

// // getPostgresDialector returns GORM PostgreSQL dialector
// func getPostgresDialector() gorm.Dialector {
//     dbConfig := DBConfig{
//         Host:     getEnv("DB_HOST", "localhost"),
//         Port:     getEnv("DB_PORT", "5432"),
//         User:     getEnv("DB_USER", "postgres"),
//         Password: getEnv("DB_PASSWORD", ""),
//         DBName:   getEnv("DB_NAME", "goreporter"),
//         SSLMode:  getEnv("DB_SSLMODE", "disable"),
//     }

//     // Build PostgreSQL DSN
//     dsn := fmt.Sprintf(
//         "host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
//         dbConfig.Host,
//         dbConfig.Port,
//         dbConfig.User,
//         dbConfig.Password,
//         dbConfig.DBName,
//         dbConfig.SSLMode,
//     )

//     return postgres.Open(dsn)
// }

// // enablePgCrypto enables the pgcrypto extension using GORM
// func enablePgCrypto() error {
//     return DB.Exec("CREATE EXTENSION IF NOT EXISTS pgcrypto").Error
// }

// // getEnv gets environment variable with default value
// func getEnv(key, defaultValue string) string {
//     value := os.Getenv(key)
//     if value == "" {
//         return defaultValue
//     }
//     return value
// }

// // CloseDatabase closes the database connection
// func CloseDatabase() error {
//     sqlDB, err := DB.DB()
//     if err != nil {
//         return err
//     }
//     return sqlDB.Close()
// }
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