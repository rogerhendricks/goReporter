package models

import "time"

// ProductivityReport represents a weekly productivity summary for a user
type ProductivityReport struct {
	UserID                uint                 `json:"userId"`
	Username              string               `json:"username"`
	FullName              string               `json:"fullName"`
	Role                  string               `json:"role"`
	StartDate             time.Time            `json:"startDate"`
	EndDate               time.Time            `json:"endDate"`
	TotalTasksCompleted   int                  `json:"totalTasksCompleted"`
	TasksByPriority       TasksByPriority      `json:"tasksByPriority"`
	TasksByStatus         TasksByStatus        `json:"tasksByStatus"`
	TasksCreated          int                  `json:"tasksCreated"`
	AverageCompletionTime float64              `json:"averageCompletionTime"` // in hours
	OnTimeCompletions     int                  `json:"onTimeCompletions"`
	LateCompletions       int                  `json:"lateCompletions"`
	TopPatients           []PatientTaskSummary `json:"topPatients"`
	// Report metrics
	ReportsCompleted int `json:"reportsCompleted"`
	ReportsCreated   int `json:"reportsCreated"`
	ReportsPending   int `json:"reportsPending"`
}

// TeamProductivityReport represents aggregate stats for a team
type TeamProductivityReport struct {
	ManagerID                 uint                     `json:"managerId"`
	ManagerName               string                   `json:"managerName"`
	StartDate                 time.Time                `json:"startDate"`
	EndDate                   time.Time                `json:"endDate"`
	TeamMembers               []ProductivityReport     `json:"teamMembers"`
	TotalTasksCompleted       int                      `json:"totalTasksCompleted"`
	TotalTasksCreated         int                      `json:"totalTasksCreated"`
	TeamAverageCompletionTime float64                  `json:"teamAverageCompletionTime"`
	TopPerformers             []UserPerformanceSummary `json:"topPerformers"`
	// Report metrics
	TotalReportsCompleted int `json:"totalReportsCompleted"`
	TotalReportsCreated   int `json:"totalReportsCreated"`
	TotalReportsPending   int `json:"totalReportsPending"`
}

// TasksByPriority breaks down completed tasks by priority
type TasksByPriority struct {
	Urgent int `json:"urgent"`
	High   int `json:"high"`
	Medium int `json:"medium"`
	Low    int `json:"low"`
}

// TasksByStatus breaks down tasks by their current status
type TasksByStatus struct {
	Pending    int `json:"pending"`
	InProgress int `json:"inProgress"`
	Completed  int `json:"completed"`
	Cancelled  int `json:"cancelled"`
}

// PatientTaskSummary shows task counts per patient
type PatientTaskSummary struct {
	PatientID   uint   `json:"patientId"`
	PatientName string `json:"patientName"`
	TaskCount   int    `json:"taskCount"`
}

// UserPerformanceSummary is a simplified user performance metric
type UserPerformanceSummary struct {
	UserID              uint    `json:"userId"`
	Username            string  `json:"username"`
	FullName            string  `json:"fullName"`
	TotalTasksCompleted int     `json:"totalTasksCompleted"`
	OnTimeRate          float64 `json:"onTimeRate"` // percentage
}
