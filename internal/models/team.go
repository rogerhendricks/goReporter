package models

import (
	"time"

	"github.com/rogerhendricks/goReporter/internal/config"
	"gorm.io/gorm"
)

// Team represents a group of users working together
type Team struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"not null;uniqueIndex:idx_teams_name_deleted" json:"name"`
	Description *string        `json:"description"`
	Color       *string        `json:"color"`     // For UI differentiation
	ManagerID   *uint          `json:"managerId"` // Optional team manager
	Manager     *User          `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
	Members     []User         `gorm:"many2many:team_members;" json:"members"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"uniqueIndex:idx_teams_name_deleted;index" json:"-"`
}

// GetAllTeams retrieves all teams with their members
func GetAllTeams() ([]Team, error) {
	var teams []Team
	err := config.DB.
		Preload("Manager").
		Preload("Members").
		Order("name ASC").
		Find(&teams).Error
	return teams, err
}

// GetTeamByID retrieves a team by ID with members
func GetTeamByID(id uint) (*Team, error) {
	var team Team
	err := config.DB.
		Preload("Manager").
		Preload("Members").
		First(&team, id).Error
	return &team, err
}

// CreateTeam creates a new team
func CreateTeam(team *Team) error {
	return config.DB.Create(team).Error
}

// UpdateTeam updates an existing team
func UpdateTeam(team *Team) error {
	return config.DB.Session(&gorm.Session{FullSaveAssociations: true}).Save(team).Error
}

// DeleteTeam soft deletes a team
func DeleteTeam(id uint) error {
	return config.DB.Delete(&Team{}, id).Error
}

// AddMembersToTeam adds users to a team
func AddMembersToTeam(teamID uint, userIDs []uint) error {
	var team Team
	if err := config.DB.First(&team, teamID).Error; err != nil {
		return err
	}

	var users []User
	if err := config.DB.Find(&users, userIDs).Error; err != nil {
		return err
	}

	return config.DB.Model(&team).Association("Members").Append(users)
}

// RemoveMembersFromTeam removes users from a team
func RemoveMembersFromTeam(teamID uint, userIDs []uint) error {
	var team Team
	if err := config.DB.First(&team, teamID).Error; err != nil {
		return err
	}

	var users []User
	if err := config.DB.Find(&users, userIDs).Error; err != nil {
		return err
	}

	return config.DB.Model(&team).Association("Members").Delete(users)
}
