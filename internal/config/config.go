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
		log.Fatal("Error loading .env file")
	}

	return &Config{
		Port: getEnv("PORT", "5000"),
		URL:  getEnv("URL", "http://localhost:8000"),
		JWTSecret: getEnv("JWT_SECRET", "your_jwt_secret"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}