package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
	"gorm.io/gorm"
)

// GetAllTeams retrieves all teams
func GetAllTeams(c *fiber.Ctx) error {
	teams, err := models.GetAllTeams()
	if err != nil {
		log.Printf("Error fetching teams: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch teams"})
	}
	return c.JSON(teams)
}

// GetTeam retrieves a single team by ID
func GetTeam(c *fiber.Ctx) error {
	teamID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid team ID"})
	}

	team, err := models.GetTeamByID(uint(teamID))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Team not found"})
		}
		log.Printf("Error fetching team: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch team"})
	}

	return c.JSON(team)
}

// CreateTeam creates a new team
func CreateTeam(c *fiber.Ctx) error {
	var team models.Team
	if err := c.BodyParser(&team); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Parse member IDs from request
	var reqBody struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		Color       *string `json:"color"`
		ManagerID   *uint   `json:"managerId"`
		MemberIDs   []uint  `json:"memberIds"`
	}

	if err := c.BodyParser(&reqBody); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	team.Name = reqBody.Name
	team.Description = reqBody.Description
	team.Color = reqBody.Color
	team.ManagerID = reqBody.ManagerID

	// Load members if provided
	if len(reqBody.MemberIDs) > 0 {
		var members []models.User
		if err := config.DB.Find(&members, reqBody.MemberIDs).Error; err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid member IDs"})
		}
		team.Members = members
	}

	if err := models.CreateTeam(&team); err != nil {
		log.Printf("Error creating team: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create team"})
	}

	// Reload with associations
	createdTeam, _ := models.GetTeamByID(team.ID)
	return c.Status(http.StatusCreated).JSON(createdTeam)
}

// UpdateTeam updates an existing team
func UpdateTeam(c *fiber.Ctx) error {
	teamID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid team ID"})
	}

	existingTeam, err := models.GetTeamByID(uint(teamID))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Team not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch team"})
	}

	var reqBody struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		Color       *string `json:"color"`
		ManagerID   *uint   `json:"managerId"`
		MemberIDs   []uint  `json:"memberIds"`
	}

	if err := c.BodyParser(&reqBody); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	existingTeam.Name = reqBody.Name
	existingTeam.Description = reqBody.Description
	existingTeam.Color = reqBody.Color
	existingTeam.ManagerID = reqBody.ManagerID

	// Update members if provided
	if reqBody.MemberIDs != nil {
		var members []models.User
		if err := config.DB.Find(&members, reqBody.MemberIDs).Error; err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid member IDs"})
		}
		existingTeam.Members = members
	}

	if err := models.UpdateTeam(existingTeam); err != nil {
		log.Printf("Error updating team: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update team"})
	}

	// Reload with associations
	updatedTeam, _ := models.GetTeamByID(existingTeam.ID)
	return c.JSON(updatedTeam)
}

// DeleteTeam deletes a team
func DeleteTeam(c *fiber.Ctx) error {
	teamID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid team ID"})
	}

	if err := models.DeleteTeam(uint(teamID)); err != nil {
		log.Printf("Error deleting team: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete team"})
	}

	return c.SendStatus(http.StatusNoContent)
}

// AddTeamMembers adds members to a team
func AddTeamMembers(c *fiber.Ctx) error {
	teamID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid team ID"})
	}

	var reqBody struct {
		MemberIDs []uint `json:"memberIds"`
	}

	if err := c.BodyParser(&reqBody); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := models.AddMembersToTeam(uint(teamID), reqBody.MemberIDs); err != nil {
		log.Printf("Error adding team members: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to add members"})
	}

	team, _ := models.GetTeamByID(uint(teamID))
	return c.JSON(team)
}

// RemoveTeamMembers removes members from a team
func RemoveTeamMembers(c *fiber.Ctx) error {
	teamID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid team ID"})
	}

	var reqBody struct {
		MemberIDs []uint `json:"memberIds"`
	}

	if err := c.BodyParser(&reqBody); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := models.RemoveMembersFromTeam(uint(teamID), reqBody.MemberIDs); err != nil {
		log.Printf("Error removing team members: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to remove members"})
	}

	team, _ := models.GetTeamByID(uint(teamID))
	return c.JSON(team)
}

// GetSpecificTeamProductivityReport generates productivity report for a specific team
func GetSpecificTeamProductivityReport(c *fiber.Ctx) error {
	teamID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid team ID"})
	}

	startDate, endDate, err := parseDateRange(c)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	report, err := generateTeamProductivityReportByTeamID(uint(teamID), startDate, endDate)
	if err != nil {
		log.Printf("Error generating team productivity report: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate report"})
	}

	return c.JSON(report)
}

// GetAllTeamsProductivityReports gets productivity reports for all teams
func GetAllTeamsProductivityReports(c *fiber.Ctx) error {
	startDate, endDate, err := parseDateRange(c)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	teams, err := models.GetAllTeams()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch teams"})
	}

	var reports []models.TeamProductivityReport
	for _, team := range teams {
		report, err := generateTeamProductivityReportByTeamID(team.ID, startDate, endDate)
		if err != nil {
			log.Printf("Error generating report for team %d: %v", team.ID, err)
			continue
		}
		reports = append(reports, *report)
	}

	return c.JSON(reports)
}

// Helper function to parse date range from query parameters
func parseDateRange(c *fiber.Ctx) (time.Time, time.Time, error) {
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")

	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
	} else {
		startDate = time.Now().AddDate(0, -1, 0) // Default to 1 month ago
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
	} else {
		endDate = time.Now() // Default to now
	}

	return startDate, endDate, nil
}

// Helper function to generate team productivity report by team ID
func generateTeamProductivityReportByTeamID(teamID uint, startDate, endDate time.Time) (*models.TeamProductivityReport, error) {
	team, err := models.GetTeamByID(teamID)
	if err != nil {
		return nil, err
	}

	teamReport := &models.TeamProductivityReport{
		ManagerID:   teamID, // Using team ID as identifier
		ManagerName: team.Name,
		StartDate:   startDate,
		EndDate:     endDate,
	}

	var totalCompletionTime float64
	var completionTimeCount int

	for _, member := range team.Members {
		report, err := generateProductivityReportByID(member.ID, startDate, endDate)
		if err != nil {
			continue
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

	// Sort top performers by tasks completed
	if len(teamReport.TopPerformers) > 1 {
		for i := 0; i < len(teamReport.TopPerformers)-1; i++ {
			for j := i + 1; j < len(teamReport.TopPerformers); j++ {
				if teamReport.TopPerformers[j].TotalTasksCompleted > teamReport.TopPerformers[i].TotalTasksCompleted {
					teamReport.TopPerformers[i], teamReport.TopPerformers[j] = teamReport.TopPerformers[j], teamReport.TopPerformers[i]
				}
			}
		}
	}

	// Limit to top 5
	if len(teamReport.TopPerformers) > 5 {
		teamReport.TopPerformers = teamReport.TopPerformers[:5]
	}

	return teamReport, nil
}
