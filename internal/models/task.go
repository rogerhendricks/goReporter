package models

import (
    "time"
    "gorm.io/gorm"
)

type TaskStatus string
type TaskPriority string

const (
    TaskStatusPending    TaskStatus = "pending"
    TaskStatusInProgress TaskStatus = "in_progress"
    TaskStatusCompleted  TaskStatus = "completed"
    TaskStatusCancelled  TaskStatus = "cancelled"
)

const (
    TaskPriorityLow      TaskPriority = "low"
    TaskPriorityMedium   TaskPriority = "medium"
    TaskPriorityHigh     TaskPriority = "high"
    TaskPriorityUrgent   TaskPriority = "urgent"
)

type Task struct {
    ID          uint           `json:"id" gorm:"primaryKey"`
    Title       string         `json:"title" gorm:"not null"`
    Description string         `json:"description" gorm:"type:text"`
    Status      TaskStatus     `json:"status" gorm:"type:varchar(20);default:'pending'"`
    Priority    TaskPriority   `json:"priority" gorm:"type:varchar(20);default:'medium'"`
    DueDate     *time.Time     `json:"dueDate"`
    CompletedAt *time.Time     `json:"completedAt"`
    
    // Associations
    PatientID   *uint          `json:"patientId" gorm:"index"`
    Patient     *Patient       `json:"patient,omitempty" gorm:"foreignKey:PatientID"`
    
    AssignedToID *uint         `json:"assignedToId" gorm:"index"`
    AssignedTo   *User         `json:"assignedTo,omitempty" gorm:"foreignKey:AssignedToID"`
    
    CreatedByID  uint          `json:"createdById" gorm:"not null;index"`
    CreatedBy    User          `json:"createdBy" gorm:"foreignKey:CreatedByID"`
    
    TemplateID   *uint         `json:"templateId" gorm:"index"`
    Template     *TaskTemplate `json:"template,omitempty" gorm:"foreignKey:TemplateID"`

    Tags         []Tag         `json:"tags,omitempty" gorm:"many2many:task_tags;"`
    Notes        []TaskNote    `json:"notes,omitempty" gorm:"foreignKey:TaskID"`
    
    CreatedAt   time.Time      `json:"createdAt"`
    UpdatedAt   time.Time      `json:"updatedAt"`
    DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type TaskNote struct {
    ID        uint           `json:"id" gorm:"primaryKey"`
    TaskID    uint           `json:"taskId" gorm:"not null;index"`
    Content   string         `json:"content" gorm:"type:text;not null"`
    CreatedByID uint         `json:"createdById" gorm:"not null"`
    CreatedBy User           `json:"createdBy" gorm:"foreignKey:CreatedByID"`
    CreatedAt time.Time      `json:"createdAt"`
    UpdatedAt time.Time      `json:"updatedAt"`
    UpdatedBy *uint          `json:"updatedBy"`
    DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
    UpdatedByUser *User      `json:"updatedByUser,omitempty" gorm:"foreignKey:UpdatedBy"`
}

type TaskTemplate struct {
    ID          uint           `json:"id" gorm:"primaryKey"`
    Name        string         `json:"name" gorm:"not null;uniqueIndex"`
    Description string         `json:"description" gorm:"type:text"`
    Title       string         `json:"title" gorm:"not null"`
    TaskDescription string     `json:"taskDescription" gorm:"type:text"`
    Priority    TaskPriority   `json:"priority" gorm:"type:varchar(20);default:'medium'"`
    DaysUntilDue *int          `json:"daysUntilDue"`
    Tags        []Tag          `json:"tags,omitempty" gorm:"many2many:task_template_tags;"`
    CreatedAt   time.Time      `json:"createdAt"`
    UpdatedAt   time.Time      `json:"updatedAt"`
    DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}