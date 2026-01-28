package testutil

import (
	"path/filepath"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

// SetupTestEnv configures environment variables and an isolated SQLite database
// for tests that rely on the global config.DB connection. It returns the test DB
// connection so callers can perform additional initialization if needed.
func SetupTestEnv(t *testing.T) *gorm.DB {
	t.Helper()

	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("JWT_ISSUER", "goReporter-test")
	t.Setenv("JWT_AUDIENCE", "goReporter-test-client")

	dbPath := filepath.Join(t.TempDir(), "test.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	// Ensure tables exist for models used in tests.
	if err := db.AutoMigrate(
		&models.User{},
		&models.Token{},
		&models.Doctor{},
		&models.Patient{},
		&models.PatientDoctor{},
		&models.Address{},
		&models.Task{},
		&models.Report{},
	); err != nil {

		t.Fatalf("failed to migrate test database: %v", err)
	}

	config.DB = db

	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return db
}
