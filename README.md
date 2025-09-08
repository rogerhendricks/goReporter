# go-fiber-backend/README.md

# Go Fiber Backend

This project is a backend application built using the Fiber framework in Go. It replicates the functionality of an existing Express.js backend application, providing a RESTful API for various resources.

## Project Structure

```
go-fiber-backend
├── cmd
│   └── api
│       └── main.go          # Entry point of the application
├── internal
│   ├── config
│   │   └── config.go       # Configuration settings
│   ├── handlers
│   │   ├── admin.go        # Admin-related request handlers
│   │   ├── auth.go         # Authentication request handlers
│   │   ├── device.go       # Device management request handlers
│   │   ├── doctor.go       # Doctor management request handlers
│   │   ├── file.go         # File handling request handlers
│   │   ├── lead.go         # Lead management request handlers
│   │   ├── medication.go    # Medication management request handlers
│   │   ├── patient.go      # Patient management request handlers
│   │   ├── report.go       # Report generation and retrieval handlers
│   │   └── user.go         # User-related request handlers
│   ├── middleware
│   │   └── auth.go         # Authentication and authorization middleware
│   ├── models
│   │   ├── device.go       # Device model
│   │   ├── doctor.go       # Doctor model
│   │   ├── lead.go         # Lead model
│   │   ├── medication.go    # Medication model
│   │   ├── patient.go      # Patient model
│   │   ├── report.go       # Report model
│   │   └── user.go         # User model
│   └── router
│       └── router.go       # Route setup
├── go.mod                   # Module definition
└── README.md                # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd go-fiber-backend
   ```

2. **Install dependencies:**
   Ensure you have Go installed, then run:
   ```
   go mod tidy
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory and set the necessary environment variables.

4. **Seed Database**
   Edit internal/bootstrap/bootstrap.go to add any additional data to the database
   * One-time and seed:  
   ```
   DB_RESET=file DB_SEED=1 go run cmd/api/main.go
   ```

5. **Run the application:**
   ```
   go run cmd/api/main.go
   ```

6. **Future features:**
   Patient medications, billing
   
7. **Todo**
   Remove soft deletes for updating implanted devices and implanted leads in database
   
## Usage

The API provides various endpoints for managing users, devices, doctors, patients, medications, leads, and reports. Refer to the individual handler files for specific route details and request formats.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.