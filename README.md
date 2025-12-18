# go-fiber-backend/README.md

# GoReporter - Medical Device Reporting System

A comprehensive medical device reporting and patient management system built with Go (Fiber framework) backend and React (TypeScript + Vite) frontend. This application is designed for healthcare facilities to manage patients, medical devices, implanted devices, leads, and clinical reports with HIPAA-compliance considerations.

## 🏗️ Project Structure

```
goReporter/
├── cmd/
│   └── api/
│       └── main.go                 # Application entry point
├── internal/
│   ├── bootstrap/
│   │   └── bootstrap.go           # Database migration, seeding, and initialization
│   ├── config/
│   │   ├── config.go              # Configuration management
│   │   └── database.go            # SQLite database connection
│   ├── handlers/
│   │   ├── admin.go               # Admin operations
│   │   ├── analytics.go           # Dashboard analytics
│   │   ├── auth.go                # Authentication (login, logout, register, refresh)
│   │   ├── consent.go             # Patient consent management
│   │   ├── device.go              # Medical device catalog management
│   │   ├── doctor.go              # Doctor/physician management
│   │   ├── file.go                # File upload/download handling
│   │   ├── lead.go                # Medical lead catalog management
│   │   ├── medication.go          # Medication management
│   │   ├── patient.go             # Patient CRUD and search
│   │   ├── report.go              # Clinical report generation
│   │   ├── search.go              # Advanced search functionality
│   │   ├── securityLogs.go        # Security audit log access
│   │   ├── static.go              # Static file serving
│   │   ├── tag.go                 # Task tagging system
│   │   ├── task.go                # Task management and templates
│   │   └── user.go                # User management
│   ├── middleware/
│   │   ├── auth.go                # JWT authentication middleware
│   │   ├── csrf.go                # CSRF protection
│   │   └── logging.go             # Security event logging middleware
│   ├── models/
│   │   ├── address.go             # Doctor address model
│   │   ├── consent.go             # Patient consent tracking
│   │   ├── device.go              # Device catalog model
│   │   ├── doctor.go              # Doctor profile model
│   │   ├── implantedDevice.go     # Patient implanted devices
│   │   ├── implantedLead.go       # Patient implanted leads
│   │   ├── lead.go                # Lead catalog model
│   │   ├── medication.go          # Medication model
│   │   ├── patient.go             # Patient demographics and relationships
│   │   ├── report.go              # Clinical report model
│   │   ├── tag.go                 # Task tags
│   │   ├── task.go                # Task and template models
│   │   ├── token.go               # Refresh token management
│   │   └── user.go                # User accounts and authentication
│   ├── router/
│   │   └── router.go              # Route definitions and middleware setup
│   ├── security/
│   │   └── security.go            # Security event logging system
│   └── utils/
│       └── utils.go               # Utility functions
├── frontend/
│   ├── src/
│   │   ├── components/            # React components (forms, tables, charts, UI)
│   │   ├── context/               # React context providers
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── pages/                 # Page components (dashboards, management views)
│   │   ├── router/                # React Router setup
│   │   ├── services/              # API service layer
│   │   ├── stores/                # State management (Zustand)
│   │   └── utils/                 # Frontend utilities
│   ├── public/                    # Static assets and templates
│   └── package.json               # Frontend dependencies
├── logs/                          # Security and application logs
├── go.mod                         # Go module definition
├── build.bash                     # Build script
└── README.md                      # This file
```

## ✨ Key Features

### 🔐 Security & Authentication
- **JWT-based Authentication**: Access tokens (HTTP-only cookies) and refresh tokens
- **Role-Based Access Control (RBAC)**: Admin, User/Doctor roles with granular permissions
- **CSRF Protection**: Token-based CSRF prevention
- **Rate Limiting**: Brute-force protection on authentication endpoints
- **Account Lockout**: Automatic account locking after failed login attempts
- **Password Security**: Bcrypt hashing with complexity requirements
- **Security Audit Logging**: Comprehensive event logging for HIPAA compliance
- **Security Headers**: Helmet middleware for XSS, clickjacking protection

### 👥 User Management
- Multi-role user system (Admin, Doctor/User)
- User profile management
- Doctor-patient assignment and access control
- Account creation restricted to admins

### 🏥 Patient Management
- Comprehensive patient demographics
- Multiple addresses support
- Doctor-patient relationships
- Implanted device and lead tracking
- Medication history
- Report history
- Advanced search with multiple filters
- Pagination support

### 📱 Medical Device Catalog
- Device library management
- Lead catalog management
- Manufacturer tracking
- Model and serial number organization
- Search functionality

### 📊 Clinical Reporting
- Report creation and management
- PDF upload and storage
- Report data extraction and parsing
- Patient-specific report viewing
- Recent reports dashboard
- Arrhythmia tracking and analysis

### ✅ Task Management System
- Task creation with priorities and due dates
- Status tracking (pending, in progress, completed)
- Task templates for common workflows
- Tag-based organization
- Staff assignment capabilities
- Progress notes and comments
- Patient-specific task lists
- Dashboard view of all tasks

### 📋 Patient Consent Tracking
- Multiple consent types (Treatment, Data Sharing, Remote Monitoring, etc.)
- Consent status tracking (Active, Revoked, Expired)
- Expiration date management
- Consent history and audit trail
- Automated expiration checking
- Terms reacceptance workflow

### 📈 Analytics Dashboard
- Patient count metrics
- Report statistics
- Task overview
- System activity monitoring

### 🔍 Advanced Search
- Multi-field patient search
- Device and lead search
- Doctor search
- Complex query support with multiple filters

## 🛠️ Technology Stack

### Backend
- **Framework**: Go Fiber v2.52.9
- **Database**: SQLite with GORM ORM
- **Authentication**: JWT (golang-jwt/jwt v5)
- **Password Hashing**: bcrypt (golang.org/x/crypto)
- **Configuration**: godotenv for environment variables

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router
- **State Management**: Zustand
- **UI Components**: Custom component library with shadcn/ui
- **Forms**: React Hook Form with validation
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS

### Security Features
- HTTP-only cookies for tokens
- CSRF token protection
- Rate limiting on sensitive endpoints
- Comprehensive security event logging
- Role-based middleware
- IP-based tracking for rate limits

## 🚀 Setup Instructions

### Prerequisites
- Go 1.23.0 or higher
- Node.js 18+ and npm (for frontend)
- Git

### Backend Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd goReporter
   ```

2. **Install Go dependencies:**
   ```bash
   go mod download
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   URL=http://localhost:5000
   JWT_SECRET=your-secure-random-secret-key-min-32-chars
   FRONTEND_URL=http://localhost:3000
   ```
   
   **Important**: Use a strong, randomly generated JWT_SECRET (minimum 32 characters)

4. **Database Setup and Seeding:**
   
   The application uses SQLite and will automatically create the database file.
   
   **Full database reset with file removal and seeding:**
   ```bash
   DB_RESET=file DB_SEED=1 go run cmd/api/main.go
   ```
   
   **Database reset without file removal (drop tables only) and seeding:**
   ```bash
   DB_RESET=drop DB_SEED=1 go run cmd/api/main.go
   ```
   
   **Normal start (migrations only, no seeding unless database is empty):**
   ```bash
   go run cmd/api/main.go
   ```
   
   Edit `internal/bootstrap/bootstrap.go` to customize seed data.

5. **Run the backend:**
   ```bash
   go run cmd/api/main.go
   ```
   
   The server will start on `http://localhost:5000` (or the PORT specified in .env)

### Frontend SetupP

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   Create a `.env` file in the frontend directory:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   
   The frontend will start on `http://localhost:3000`

5. **Build for production:**
   ```bash
   npm run build
   ```

### Default Admin Account

After seeding, you can log in with:
- **Username**: `admin`
- **Password**: Check `internal/bootstrap/bootstrap.go` for the default password
- **Role**: Admin (full access)

**Important**: Change the default admin password immediately in production!

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login (rate limited)
- `POST /api/auth/register` - Register new user (admin only)
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/me` - Get current user info
- `GET /api/csrf-token` - Get CSRF token

### Users
- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users` - Create user

### Patients
- `GET /api/patients` - Get patients (role-filtered)
- `GET /api/patients/all` - Get paginated patients
- `GET /api/patients/list` - Get all patients list
- `GET /api/patients/recent` - Get recent patients
- `GET /api/patients/search` - Search patients
- `POST /api/patients` - Create patient (admin/user)
- `GET /api/patients/:id` - Get patient details
- `PUT /api/patients/:id` - Update patient (admin/user)
- `DELETE /api/patients/:id` - Delete patient (admin/user)
- `GET /api/patients/:patientId/reports` - Get patient reports
- `GET /api/patients/:patientId/tasks` - Get patient tasks
- `GET /api/patients/:patientId/consents` - Get patient consents

### Devices & Leads
- `GET /api/devices/all` - Get all devices (basic)
- `GET /api/devices/search` - Search devices
- `GET /api/devices` - Get devices (admin)
- `POST /api/devices` - Create device (admin)
- `GET /api/devices/:id` - Get device
- `PUT /api/devices/:id` - Update device (admin)
- `DELETE /api/devices/:id` - Delete device (admin)
- `GET /api/leads/all` - Get all leads (basic)
- `GET /api/leads/search` - Search leads
- `GET /api/leads/:id` - Get lead
- `POST /api/leads` - Create lead (admin)
- `PUT /api/leads/:id` - Update lead (admin)
- `DELETE /api/leads/:id` - Delete lead (admin)

### Doctors
- `GET /api/doctors/all` - Get all doctors
- `GET /api/doctors` - Get doctors (basic)
- `GET /api/doctors/search` - Search doctors
- `POST /api/doctors` - Create doctor (admin)
- `GET /api/doctors/:id` - Get doctor
- `PUT /api/doctors/:id` - Update doctor (admin)
- `DELETE /api/doctors/:id` - Delete doctor (admin)

### Reports
- `POST /api/reports` - Create report with file upload
- `GET /api/reports/recent` - Get recent reports
- `GET /api/reports/:id` - Get report
- `PUT /api/reports/:id` - Update report (admin/user)
- `DELETE /api/reports/:id` - Delete report (admin/user)

### Tasks
- `GET /api/tasks` - Get all tasks (admin/user)
- `POST /api/tasks` - Create task (admin/user)
- `GET /api/tasks/:id` - Get task
- `PUT /api/tasks/:id` - Update task (admin/user)
- `DELETE /api/tasks/:id` - Delete task (admin/user)
- `POST /api/tasks/:id/notes` - Add task note
- `PUT /api/tasks/:id/notes/:noteId` - Update task note
- `DELETE /api/tasks/:id/notes/:noteId` - Delete task note

### Task Templates
- `GET /api/task-templates` - Get templates (admin/user)
- `POST /api/task-templates` - Create template (admin)
- `PUT /api/task-templates/:id` - Update template (admin)
- `DELETE /api/task-templates/:id` - Delete template (admin)
- `POST /api/task-templates/:id/assign` - Assign template to patient
- `GET /api/task-templates/:id/patients` - Get patients with template

### Consents
- `GET /api/patients/:patientId/consents/active` - Get active consents
- `POST /api/patients/:patientId/consents` - Create consent (admin/user)
- `PUT /api/consents/:id` - Update consent (admin/user)
- `POST /api/consents/:id/reaccept-terms` - Reaccept terms
- `POST /api/consents/:id/revoke` - Revoke consent
- `GET /api/patients/:patientId/consents/check` - Check consent status

### Tags
- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create tag (admin/user)
- `PUT /api/tags/:id` - Update tag (admin/user)
- `DELETE /api/tags/:id` - Delete tag (admin/user)

### Analytics & Admin
- `GET /api/analytics/summary` - Get dashboard analytics
- `GET /api/admin/security-logs` - Get security logs (admin)
- `GET /api/admin/security-logs/export` - Export security logs (admin)

### Files
- `GET /api/files/*` - Serve uploaded files

### Search
- `GET /api/search/patients` - Advanced patient search

## 🔒 Security Implementation Status

### ✅ Completed Security Features

1. **JWT Secret Handling** - Secure environment variable management
2. **Protected Registration** - Admin-only user creation
3. **Refresh Tokens** - Separate access and refresh token system
4. **HTTP-only Cookies** - Tokens stored securely in cookies
5. **Authentication Rate Limiting** - Brute-force protection (50 attempts per 15 min)
6. **CSRF Protection** - Token-based CSRF prevention
7. **Password Complexity** - Strong password requirements
8. **File Upload Limits** - Size restrictions on uploads
9. **Account Lockout** - Automatic locking after failed attempts
10. **Security Event Logging** - Comprehensive audit trail
11. **Security Headers** - Helmet middleware (XSS, clickjacking protection)
12. **Patient Consent Tracking** - HIPAA-compliant consent management

### 🔄 In Progress / Future Enhancements

1. **Session Management** - Enhanced session tracking and management
2. **Email Validation** - Email verification system
3. **Notifications** - Email/SMS reminders for tasks
4. **Data Encryption at Rest** - Database encryption
5. **Data Retention Policies** - Automated data lifecycle management
6. **Backup and Recovery** - Automated backup systems

### 🔍 Ongoing Security Requirements

- Regular security audits
- Dependency vulnerability scanning
- Penetration testing
- HIPAA compliance review
- Regular password rotation policies

## 🏥 HIPAA Compliance Considerations

This system handles Protected Health Information (PHI) and includes features designed with HIPAA compliance in mind:

- ✅ **Audit Logging**: Comprehensive security event logging for all PHI access
- ✅ **Access Controls**: Role-based access with doctor-patient relationships
- ✅ **Authentication**: Strong authentication with account lockout
- ✅ **Consent Tracking**: Patient consent management and tracking
- ⚠️ **Encryption in Transit**: HTTPS recommended for production (not included in code)
- ⚠️ **Encryption at Rest**: Additional database encryption recommended
- ⚠️ **Backup and Recovery**: Implement regular backup procedures
- ⚠️ **Business Associate Agreements**: Required for third-party services

**Note**: This application provides a foundation for HIPAA compliance but requires additional infrastructure security, policies, and procedures for full compliance.

## 🎯 Use Cases

1. **Medical Device Follow-up Clinics**: Track patient implanted devices and leads
2. **Cardiology Practices**: Monitor pacemaker and ICD reports
3. **Device Clinics**: Manage multiple device manufacturers and models
4. **Clinical Reporting**: Store and retrieve device interrogation reports
5. **Task Management**: Track follow-up appointments and patient care tasks
6. **Multi-Provider Practices**: Manage doctor-patient assignments and access

## 📚 Additional Documentation

- [CHATBOT_INTEGRATION.md](CHATBOT_INTEGRATION.md) - n8n chatbot integration guide
- [deployment.md](deployment.md) - Deployment instructions
- Frontend documentation in [frontend/README.md](frontend/README.md)

## 🏗️ Development

### Building for Production

**Backend:**
```bash
go build -o bin/goReporter cmd/api/main.go
```

**Frontend:**
```bash
cd frontend
npm run build
```

### Running Tests
```bash
go test ./...
```

### Code Structure Best Practices

- **Handlers**: HTTP request handlers (thin layer)
- **Models**: Database models and business logic
- **Middleware**: Cross-cutting concerns (auth, logging, CSRF)
- **Services**: Complex business logic (if needed)
- **Bootstrap**: Database initialization and seeding

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0-only).

- **Full text**: See the [LICENSE](LICENSE) file or https://www.gnu.org/licenses/agpl-3.0.html
- **Network use**: If you modify and run this software to provide a service over a network, you must make the complete corresponding source code of your modified version available to users of that service under the AGPL.
- **Key points**:
  - Free to use, modify, and distribute
  - Must disclose source code
  - Network use requires source disclosure
  - Same license applies to derivatives

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**⚠️ Important Security Notice**: This application is designed for internal healthcare facility use. Ensure proper security measures are in place before deploying to production, including HTTPS, firewall configuration, regular backups, and compliance with local healthcare regulations.