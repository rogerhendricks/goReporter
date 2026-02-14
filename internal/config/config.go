package config

import (
	"log"
	"os"
	"strconv"

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

func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	return &Config{
		Port:               getEnv("PORT", "5000"),
		URL:                getEnv("URL", "http://localhost:8000"),
		JWTSecret:          jwtSecret,
		JWTIssuer:          getEnv("JWT_ISSUER", "goReporter"),
		JWTAudience:        getEnv("JWT_AUDIENCE", "goReporter-client"),
		MissedGraceMinutes: getEnvInt("MISSED_GRACE_MINUTES", 15),
		MissedLookbackDays: getEnvInt("MISSED_LOOKBACK_DAYS", 7),
	}

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
