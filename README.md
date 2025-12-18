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
   * Full file-based reset and seed / removes databse file and then recreates it:  
   ```
   DB_RESET=file DB_SEED=1 go run cmd/api/main.go
   ```
   * DB reset and seed / table drop without file removal:
   ```
   DB_RESET=drop DB_SEED=1 go run cmd/api/main.go
   ```

5. **Run the application:**
   ```
   go run cmd/api/main.go
   ```

6. **Future features:**
   Patient medications, billing
   
7. **Todo**
   * Remove soft deletes for updating implanted devices and implanted leads in database

8.
### Task Management

**Done** Task Model: Create tasks linked to patients with tags
**Done** Due Dates: Add priority levels and due dates
**Done** Status Tracking: Track task status (pending, in progress, completed)
Notifications: Email/SMS reminders for upcoming tasks
**Done** Task Templates: Pre-defined task templates for common workflows
**Done** Assignment: Assign tasks to staff members
**Done** Notes/Comments: Add progress notes to tasks
**Done** Dashboard: Visual overview of all tasks by status/priority

9. *PRIORITY SECURITY ISSUES*
   ### PRIORITY IMPLEMENTATION ORDER
   Immediate (Before Production):

   **Done** Fix JWT secret handling (#1)
   **Done** Protect registration endpoint (#2)
   **Done** Implement refresh tokens (#4)
   **Done** Move JWT to HTTP-only cookies (#5)
   **Done** Add auth rate limiting (#6)
   Short Term (Within 2 weeks):

   **Done** CSRF protection (#8)
   **Done** Password complexity (#7)
   **Done** File upload limits (#11)
   **Done** Account lockout (#13)
   Medium Term (Within 1 month):

   **Done** Security event logging (#16)
   Session management (#17)
   Email validation (#9)
   Security headers configuration (#12)
   **Done** Add patient consent tracking

   ### Ongoing:

   - Regular security audits
   - Dependency updates
   - Penetration testing

   🏥 HIPAA COMPLIANCE CONSIDERATIONS
   Since this appears to be a medical reporting system handling patient data:

   Implement comprehensive audit logging
   Add data encryption at rest
   Ensure proper access controls (partially done)
   Implement data retention policies
   Ensure proper data backup and recovery


## Usage

The API provides various endpoints for managing users, devices, doctors, patients, medications, leads, and reports. Refer to the individual handler files for specific route details and request formats.

## License

his project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0-only).

- Full text: see the LICENSE file or https://www.gnu.org/licenses/agpl-3.0.html
- Network use: if you modify and run this software to provide a service over a network, you must make the complete corresponding source code of your modified version available to users of that service under the AGPL.