package config

import (
	"log"
	"os"
	"strconv"
	"strings"
	"sync"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	URL                string
	JWTSecret          string
	JWTIssuer          string
	JWTAudience        string
	MissedGraceMinutes int
	MissedLookbackDays int
}

var (
	loadedConfig *Config
	configOnce   sync.Once
)

func LoadConfig() *Config {
	configOnce.Do(func() {
		if err := godotenv.Load(); err != nil {
			appEnv := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
			if appEnv == "" || appEnv == "development" || appEnv == "dev" {
				log.Printf("Warning: .env file not found (%v), using environment variables", err)
			}
		}

		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			log.Fatal("JWT_SECRET environment variable is required")
		}

		loadedConfig = &Config{
			Port:               getEnv("PORT", "5000"),
			URL:                getEnv("URL", "http://localhost:8000"),
			JWTSecret:          jwtSecret,
			JWTIssuer:          getEnv("JWT_ISSUER", "goReporter"),
			JWTAudience:        getEnv("JWT_AUDIENCE", "goReporter-client"),
			MissedGraceMinutes: getEnvInt("MISSED_GRACE_MINUTES", 15),
			MissedLookbackDays: getEnvInt("MISSED_LOOKBACK_DAYS", 7),
		}
	})

	return loadedConfig

}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return fallback
}
