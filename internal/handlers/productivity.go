package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

// GetUserProductivityReport generates a productivity report for a specific user
func GetUserProductivityReport(c *fiber.Ctx) error {
	userID := c.Params("userId")

	// Get date range from query params (default to last 7 days)
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -7)

	if start := c.Query("startDate"); start != "" {
		if parsed, err := time.Parse("2006-01-02", start); err == nil {
			startDate = parsed
		}
	}
	if end := c.Query("endDate"); end != "" {
		if parsed, err := time.Parse("2006-01-02", end); err == nil {
			endDate = parsed
		}
	}

	report, err := generateProductivityReport(userID, startDate, endDate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to generate productivity report",
			"details": err.Error(),
		})
	}

	return c.JSON(report)
}

// GetMyProductivityReport generates a productivity report for the authenticated user
func GetMyProductivityReport(c *fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}
	userID, ok := userIDVal.(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Get date range from query params (default to last 7 days)
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -7)

	if start := c.Query("startDate"); start != "" {
		if parsed, err := time.Parse("2006-01-02", start); err == nil {
			startDate = parsed
		}
	}
	if end := c.Query("endDate"); end != "" {
		if parsed, err := time.Parse("2006-01-02", end); err == nil {
			endDate = parsed
		}
	}

	report, err := generateProductivityReportByID(userID, startDate, endDate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to generate productivity report",
			"details": err.Error(),
		})
	}

	return c.JSON(report)
}

// GetTeamProductivityReport generates a team productivity report for managers
func GetTeamProductivityReport(c *fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}
	managerID, ok := userIDVal.(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Get date range from query params (default to last 7 days)
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -7)

	if start := c.Query("startDate"); start != "" {
		if parsed, err := time.Parse("2006-01-02", start); err == nil {
			startDate = parsed
		}
	}
	if end := c.Query("endDate"); end != "" {
		if parsed, err := time.Parse("2006-01-02", end); err == nil {
			endDate = parsed
		}
	}

	report, err := generateTeamProductivityReport(managerID, startDate, endDate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to generate team productivity report",
			"details": err.Error(),
		})
	}

	return c.JSON(report)
}

// Helper function to generate a productivity report by user ID (uint)
func generateProductivityReportByID(userID uint, startDate, endDate time.Time) (*models.ProductivityReport, error) {
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return nil, err
	}

	report := &models.ProductivityReport{
		UserID:    user.ID,
		Username:  user.Username,
		FullName:  user.FullName,
		Role:      user.Role,
		StartDate: startDate,
		EndDate:   endDate,
	}

	// Get completed tasks in date range
	var completedTasks []models.Task
	err := config.DB.
		Where("assigned_to_id = ? AND completed_at BETWEEN ? AND ?", userID, startDate, endDate).
		Preload("Patient").
		Find(&completedTasks).Error
	if err != nil {
		return nil, err
	}

	report.TotalTasksCompleted = len(completedTasks)

	// Calculate tasks by priority
	for _, task := range completedTasks {
		switch task.Priority {
		case models.TaskPriorityUrgent:
			report.TasksByPriority.Urgent++
		case models.TaskPriorityHigh:
			report.TasksByPriority.High++
		case models.TaskPriorityMedium:
			report.TasksByPriority.Medium++
		case models.TaskPriorityLow:
			report.TasksByPriority.Low++
		}

		// Calculate on-time vs late completions
		if task.DueDate != nil && task.CompletedAt != nil {
			if task.CompletedAt.Before(*task.DueDate) || task.CompletedAt.Equal(*task.DueDate) {
				report.OnTimeCompletions++
			} else {
				report.LateCompletions++
			}

			// Calculate average completion time
			createdAt := task.CreatedAt
			completionTime := task.CompletedAt.Sub(createdAt).Hours()
			report.AverageCompletionTime += completionTime
		}
	}

	if report.TotalTasksCompleted > 0 {
		report.AverageCompletionTime /= float64(report.TotalTasksCompleted)
	}

	// Get all tasks by status for this user
	var tasksByStatus []struct {
		Status string
		Count  int
	}
	config.DB.Model(&models.Task{}).
		Select("status, COUNT(*) as count").
		Where("assigned_to_id = ? AND created_at BETWEEN ? AND ?", userID, startDate, endDate).
		Group("status").
		Scan(&tasksByStatus)

	for _, stat := range tasksByStatus {
		switch stat.Status {
		case string(models.TaskStatusPending):
			report.TasksByStatus.Pending = stat.Count
		case string(models.TaskStatusInProgress):
			report.TasksByStatus.InProgress = stat.Count
		case string(models.TaskStatusCompleted):
			report.TasksByStatus.Completed = stat.Count
		case string(models.TaskStatusCancelled):
			report.TasksByStatus.Cancelled = stat.Count
		}
	}

	// Get tasks created by this user
	var tasksCreated int64
	config.DB.Model(&models.Task{}).
		Where("created_by_id = ? AND created_at BETWEEN ? AND ?", userID, startDate, endDate).
		Count(&tasksCreated)
	report.TasksCreated = int(tasksCreated)

	// Get top patients by task count
	var topPatients []models.PatientTaskSummary
	config.DB.Raw(`
		SELECT 
			p.id as patient_id,
			p.name as patient_name,
			COUNT(t.id) as task_count
		FROM tasks t
		INNER JOIN patients p ON t.patient_id = p.id
		WHERE t.assigned_to_id = ? 
			AND t.completed_at BETWEEN ? AND ?
		GROUP BY p.id, p.name
		ORDER BY task_count DESC
		LIMIT 5
	`, userID, startDate, endDate).Scan(&topPatients)
	report.TopPatients = topPatients

	// Get report metrics
	var reportsCompleted int64
	config.DB.Model(&models.Report{}).
		Where("user_id = ? AND is_completed = ? AND updated_at BETWEEN ? AND ?", userID, true, startDate, endDate).
		Count(&reportsCompleted)
	report.ReportsCompleted = int(reportsCompleted)

	var reportsCreated int64
	config.DB.Model(&models.Report{}).
		Where("user_id = ? AND created_at BETWEEN ? AND ?", userID, startDate, endDate).
		Count(&reportsCreated)
	report.ReportsCreated = int(reportsCreated)

	var reportsPending int64
	config.DB.Model(&models.Report{}).
		Where("user_id = ? AND (is_completed IS NULL OR is_completed = ?) AND created_at BETWEEN ? AND ?", userID, false, startDate, endDate).
		Count(&reportsPending)
	report.ReportsPending = int(reportsPending)

	return report, nil
}

// Helper function to generate a productivity report by user ID string
func generateProductivityReport(userIDStr string, startDate, endDate time.Time) (*models.ProductivityReport, error) {
	var user models.User
	if err := config.DB.Where("id = ?", userIDStr).First(&user).Error; err != nil {
		return nil, err
	}

	return generateProductivityReportByID(user.ID, startDate, endDate)
}

// Helper function to generate team productivity report
func generateTeamProductivityReport(managerID uint, startDate, endDate time.Time) (*models.TeamProductivityReport, error) {
	var manager models.User
	if err := config.DB.First(&manager, managerID).Error; err != nil {
		return nil, err
	}

	teamReport := &models.TeamProductivityReport{
		ManagerID:   manager.ID,
		ManagerName: manager.FullName,
		StartDate:   startDate,
		EndDate:     endDate,
	}

	// Get all team members (for now, get all users with role "user" or "doctor")
	// In a real scenario, you'd have a team structure or reporting hierarchy
	var teamMembers []models.User
	err := config.DB.Where("role IN (?, ?) AND id != ?", "user", "doctor", managerID).Find(&teamMembers).Error
	if err != nil {
		return nil, err
	}

	var totalCompletionTime float64
	var completionTimeCount int

	for _, member := range teamMembers {
		report, err := generateProductivityReportByID(member.ID, startDate, endDate)
		if err != nil {
			continue // Skip members with errors
		}

		teamReport.TeamMembers = append(teamReport.TeamMembers, *report)
		teamReport.TotalTasksCompleted += report.TotalTasksCompleted
		teamReport.TotalTasksCreated += report.TasksCreated
		teamReport.TotalReportsCompleted += report.ReportsCompleted
		teamReport.TotalReportsCreated += report.ReportsCreated
		teamReport.TotalReportsPending += report.ReportsPending

		if report.AverageCompletionTime > 0 {
			totalCompletionTime += report.AverageCompletionTime
			completionTimeCount++
		}
	}

	if completionTimeCount > 0 {
		teamReport.TeamAverageCompletionTime = totalCompletionTime / float64(completionTimeCount)
	}

	// Calculate top performers
	for _, memberReport := range teamReport.TeamMembers {
		var onTimeRate float64
		totalWithDeadline := memberReport.OnTimeCompletions + memberReport.LateCompletions
		if totalWithDeadline > 0 {
			onTimeRate = float64(memberReport.OnTimeCompletions) / float64(totalWithDeadline) * 100
		}

		teamReport.TopPerformers = append(teamReport.TopPerformers, models.UserPerformanceSummary{
			UserID:              memberReport.UserID,
			Username:            memberReport.Username,
			FullName:            memberReport.FullName,
			TotalTasksCompleted: memberReport.TotalTasksCompleted,
			OnTimeRate:          onTimeRate,
		})
	}

	// Sort top performers by tasks completed (you can change this criteria)
	// For simplicity, limiting to top 5
	if len(teamReport.TopPerformers) > 5 {
		// Simple bubble sort by total tasks completed
		for i := 0; i < len(teamReport.TopPerformers)-1; i++ {
			for j := 0; j < len(teamReport.TopPerformers)-i-1; j++ {
				if teamReport.TopPerformers[j].TotalTasksCompleted < teamReport.TopPerformers[j+1].TotalTasksCompleted {
					teamReport.TopPerformers[j], teamReport.TopPerformers[j+1] = teamReport.TopPerformers[j+1], teamReport.TopPerformers[j]
				}
			}
		}
		teamReport.TopPerformers = teamReport.TopPerformers[:5]
	}

	return teamReport, nil
}
