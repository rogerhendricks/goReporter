package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port string
	URL  string
	JWTSecret string
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
		Port: getEnv("PORT", "5000"),
		URL:  getEnv("URL", "http://localhost:8000"),
		JWTSecret: jwtSecret,
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}