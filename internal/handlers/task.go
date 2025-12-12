package handlers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

type CreateTaskRequest struct {
	Title        string     `json:"title" validate:"required"`
	Description  string     `json:"description"`
	Status       string     `json:"status"`
	Priority     string     `json:"priority"`
	DueDate      *time.Time `json:"dueDate"`
	PatientID    *uint      `json:"patientId"`
	AssignedToID *uint      `json:"assignedToId"`
	TagIDs       []uint     `json:"tagIds"`
}

type UpdateTaskRequest struct {
	Title        *string    `json:"title"`
	Description  *string    `json:"description"`
	Status       *string    `json:"status"`
	Priority     *string    `json:"priority"`
	DueDate      *time.Time `json:"dueDate"`
	AssignedToID *uint      `json:"assignedToId"`
	TagIDs       []uint     `json:"tagIds"`
}

type AddTaskNoteRequest struct {
	Content string `json:"content" validate:"required"`
}

type CreateTaskTemplateRequest struct {
	Name            string `json:"name" validate:"required"`
	Description     string `json:"description"`
	Title           string `json:"title" validate:"required"`
	TaskDescription string `json:"taskDescription"`
	Priority        string `json:"priority"`
	DaysUntilDue    *int   `json:"daysUntilDue"`
	TagIDs          []uint `json:"tagIds"`
}

type UpdateTaskTemplateRequest struct {
	Name            *string `json:"name"`
	Description     *string `json:"description"`
	Title           *string `json:"title"`
	TaskDescription *string `json:"taskDescription"`
	Priority        *string `json:"priority"`
	DaysUntilDue    *int    `json:"daysUntilDue"`
	TagIDs          []uint  `json:"tagIds"`
}

type CreateTaskFromTemplateRequest struct {
	PatientID    *uint `json:"patientId"`
	AssignedToID *uint `json:"assignedToId"`
}

type AssignTemplateRequest struct {
	PatientID int    `json:"patientId"`
	DueDate   string `json:"dueDate,omitempty"`
}

// GetTasks retrieves all tasks with filters
func GetTasks(c *fiber.Ctx) error {
	// Safely get user_id from context
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

	// Safely get user_role from context
	userRoleVal := c.Locals("user_role")
	if userRoleVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User role not found",
		})
	}
	userRole, ok := userRoleVal.(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user role",
		})
	}

	var tasks []models.Task
	query := config.DB.Preload("Patient").Preload("AssignedTo").Preload("CreatedBy").Preload("Tags").Preload("Notes.CreatedBy")

	// Filters
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if priority := c.Query("priority"); priority != "" {
		query = query.Where("priority = ?", priority)
	}
	if patientID := c.Query("patientId"); patientID != "" {
		query = query.Where("patient_id = ?", patientID)
	}
	if assignedTo := c.Query("assignedTo"); assignedTo != "" {
		query = query.Where("assigned_to_id = ?", assignedTo)
	}

	// Role-based filtering
	if userRole != "admin" && userRole != "doctor" {
		// Regular users only see tasks assigned to them or created by them
		query = query.Where("assigned_to_id = ? OR created_by_id = ?", userID, userID)
	}

	if err := query.Order("due_date ASC NULLS LAST, priority DESC, created_at DESC").Find(&tasks).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve tasks",
		})
	}

	return c.JSON(tasks)
}

// GetTask retrieves a single task by ID
func GetTask(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid task ID",
		})
	}

	// Safely get user_id from context
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

	// Safely get user_role from context
	userRoleVal := c.Locals("user_role")
	if userRoleVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User role not found",
		})
	}
	userRole, ok := userRoleVal.(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user role",
		})
	}

	var task models.Task
	query := config.DB.Preload("Patient").Preload("AssignedTo").Preload("CreatedBy").Preload("Tags").Preload("Notes.CreatedBy")

	if err := query.First(&task, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Task not found",
		})
	}

	// Check permissions
	if userRole != "admin" && userRole != "doctor" {
		if task.AssignedToID == nil || *task.AssignedToID != userID {
			if task.CreatedByID != userID {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "You don't have permission to view this task",
				})
			}
		}
	}

	return c.JSON(task)
}

// CreateTask creates a new task
func CreateTask(c *fiber.Ctx) error {
    // Safely get user_id and role from context
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

    userRoleVal := c.Locals("user_role")
    if userRoleVal == nil {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "User role not found",
        })
    }
    userRole, ok := userRoleVal.(string)
    if !ok {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Invalid user role",
        })
    }

    var req CreateTaskRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    // For regular users, automatically assign the task to themselves if no assignee specified
    assignedToID := req.AssignedToID
    if userRole != "admin" && userRole != "doctor" {
        // Regular users can only assign to themselves
        assignedToID = &userID
    } else if assignedToID == nil {
        // If admin/doctor doesn't specify an assignee, assign to themselves
        assignedToID = &userID
    }

    task := models.Task{
        Title:        req.Title,
        Description:  req.Description,
        Status:       models.TaskStatus(req.Status),
        Priority:     models.TaskPriority(req.Priority),
        DueDate:      req.DueDate,
        PatientID:    req.PatientID,
        AssignedToID: assignedToID,
        CreatedByID:  userID,
    }

    // Set defaults if not provided
    if task.Status == "" {
        task.Status = models.TaskStatusPending
    }
    if task.Priority == "" {
        task.Priority = models.TaskPriorityMedium
    }

    if err := config.DB.Create(&task).Error; err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to create task",
        })
    }

    // Add tags if provided
    if len(req.TagIDs) > 0 {
        var tags []models.Tag
        config.DB.Find(&tags, req.TagIDs)
        config.DB.Model(&task).Association("Tags").Append(tags)
    }

    // Reload with associations
    config.DB.Preload("Patient").Preload("AssignedTo").Preload("CreatedBy").Preload("Tags").First(&task, task.ID)

    return c.Status(fiber.StatusCreated).JSON(task)
}

// UpdateTask updates an existing task
func UpdateTask(c *fiber.Ctx) error {
    id, err := strconv.Atoi(c.Params("id"))
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid task ID",
        })
    }

    // Safely get user_id and role from context
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

    userRoleVal := c.Locals("user_role")
    if userRoleVal == nil {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "User role not found",
        })
    }
    userRole, ok := userRoleVal.(string)
    if !ok {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Invalid user role",
        })
    }

    var task models.Task
    if err := config.DB.First(&task, id).Error; err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
            "error": "Task not found",
        })
    }

    // Check permissions - Allow admins, doctors, task creator, or assigned user
    canUpdate := userRole == "admin" || 
                 userRole == "doctor" || 
                 task.CreatedByID == userID ||
                 (task.AssignedToID != nil && *task.AssignedToID == userID)
    
    if !canUpdate {
        return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
            "error": "You don't have permission to update this task",
        })
    }

    var req UpdateTaskRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    // Update fields
    if req.Title != nil {
        task.Title = *req.Title
    }
    if req.Description != nil {
        task.Description = *req.Description
    }
    if req.Status != nil {
        task.Status = models.TaskStatus(*req.Status)
        if *req.Status == string(models.TaskStatusCompleted) && task.CompletedAt == nil {
            now := time.Now()
            task.CompletedAt = &now
        }
    }
    if req.Priority != nil {
        task.Priority = models.TaskPriority(*req.Priority)
    }
    if req.DueDate != nil {
        task.DueDate = req.DueDate
    }
    // Only admins and doctors can reassign tasks
    if req.AssignedToID != nil && (userRole == "admin" || userRole == "doctor") {
        task.AssignedToID = req.AssignedToID
    }

    if err := config.DB.Save(&task).Error; err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to update task",
        })
    }

    // Update tags if provided (only admins and doctors can change tags)
    if req.TagIDs != nil && (userRole == "admin" || userRole == "doctor") {
        var tags []models.Tag
        config.DB.Find(&tags, req.TagIDs)
        config.DB.Model(&task).Association("Tags").Replace(tags)
    }

    // Reload with associations
    config.DB.Preload("Patient").Preload("AssignedTo").Preload("CreatedBy").Preload("Tags").Preload("Notes.CreatedBy").First(&task, task.ID)

    return c.JSON(task)
}

// DeleteTask deletes a task
func DeleteTask(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid task ID",
		})
	}

	// Safely get user_id and role from context
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

	userRoleVal := c.Locals("user_role")
	if userRoleVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User role not found",
		})
	}
	userRole, ok := userRoleVal.(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user role",
		})
	}

	var task models.Task
	if err := config.DB.First(&task, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Task not found",
		})
	}

	// Check permissions
	if userRole != "admin" && task.CreatedByID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to delete this task",
		})
	}

	if err := config.DB.Delete(&task).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete task",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// AddTaskNote adds a note to a task
func AddTaskNote(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid task ID",
		})
	}

	// Safely get user_id from context
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

	var task models.Task
	if err := config.DB.First(&task, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Task not found",
		})
	}

	var req AddTaskNoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	note := models.TaskNote{
		TaskID:      task.ID,
		Content:     req.Content,
		CreatedByID: userID,
	}

	if err := config.DB.Create(&note).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to add note",
		})
	}

	// Reload with creator
	config.DB.Preload("CreatedBy").First(&note, note.ID)

	return c.Status(fiber.StatusCreated).JSON(note)
}

// UpdateTaskNote updates a task note (only by creator)
func UpdateTaskNote(c *fiber.Ctx) error {
    taskID, err := strconv.Atoi(c.Params("id"))
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid task ID",
        })
    }

    noteID, err := strconv.Atoi(c.Params("noteId"))
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid note ID",
        })
    }

    // Safely get user_id from context
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

    var input struct {
        Content string `json:"content" validate:"required"`
    }

    if err := c.BodyParser(&input); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    // Find the note
    var note models.TaskNote
    if err := config.DB.Where("id = ? AND task_id = ?", noteID, taskID).First(&note).Error; err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
            "error": "Note not found",
        })
    }

    // Check if user is the creator
    if note.CreatedByID != userID {
        return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
            "error": "You can only edit your own notes",
        })
    }

    // Update note
    note.Content = input.Content
    note.UpdatedBy = &userID
    note.UpdatedAt = time.Now()

    if err := config.DB.Save(&note).Error; err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to update note",
        })
    }

    // Load relationships
    config.DB.Preload("CreatedBy").Preload("UpdatedBy").First(&note, note.ID)

    return c.JSON(note)
}

// DeleteTaskNote deletes a task note (only by creator)
func DeleteTaskNote(c *fiber.Ctx) error {
    taskID, err := strconv.Atoi(c.Params("id"))
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid task ID",
        })
    }

    noteID, err := strconv.Atoi(c.Params("noteId"))
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid note ID",
        })
    }

    // Safely get user_id from context
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

    // Find the note
    var note models.TaskNote
    if err := config.DB.Where("id = ? AND task_id = ?", noteID, taskID).First(&note).Error; err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
            "error": "Note not found",
        })
    }

    // Check if user is the creator
    if note.CreatedByID != userID {
        return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
            "error": "You can only delete your own notes",
        })
    }

    // Soft delete the note
    if err := config.DB.Delete(&note).Error; err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to delete note",
        })
    }

    return c.JSON(fiber.Map{
        "message": "Note deleted successfully",
    })
}

// GetTasksByPatient retrieves all tasks for a specific patient
func GetTasksByPatient(c *fiber.Ctx) error {
	patientID, err := strconv.Atoi(c.Params("patientId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid patient ID",
		})
	}

	var tasks []models.Task
	query := config.DB.Where("patient_id = ?", patientID).
		Preload("AssignedTo").Preload("CreatedBy").Preload("Tags").Preload("Notes.CreatedBy").
		Order("due_date ASC NULLS LAST, priority DESC, created_at DESC")

	if err := query.Find(&tasks).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve tasks",
		})
	}

	return c.JSON(tasks)
}

// GetTaskTemplates retrieves all task templates
func GetTaskTemplates(c *fiber.Ctx) error {
	var templates []models.TaskTemplate
	if err := config.DB.Preload("Tags").Order("name").Find(&templates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve task templates",
		})
	}

	return c.JSON(templates)
}

// GetTaskTemplate retrieves a single task template by ID
func GetTaskTemplate(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid template ID",
		})
	}

	var template models.TaskTemplate
	if err := config.DB.Preload("Tags").First(&template, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Template not found",
		})
	}

	return c.JSON(template)
}

// CreateTaskTemplate creates a new task template
func CreateTaskTemplate(c *fiber.Ctx) error {
	userRole := c.Locals("user_role").(string)
	if userRole != "admin" && userRole != "doctor" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Only admins and doctors can create templates",
		})
	}

	var req CreateTaskTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	template := models.TaskTemplate{
		Name:            req.Name,
		Description:     req.Description,
		Title:           req.Title,
		TaskDescription: req.TaskDescription,
		Priority:        models.TaskPriority(req.Priority),
		DaysUntilDue:    req.DaysUntilDue,
	}

	if template.Priority == "" {
		template.Priority = models.TaskPriorityMedium
	}

	if err := config.DB.Create(&template).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create template",
		})
	}

	// Add tags if provided
	if len(req.TagIDs) > 0 {
		var tags []models.Tag
		config.DB.Find(&tags, req.TagIDs)
		config.DB.Model(&template).Association("Tags").Append(tags)
	}

	config.DB.Preload("Tags").First(&template, template.ID)

	return c.Status(fiber.StatusCreated).JSON(template)
}

// UpdateTaskTemplate updates an existing task template
func UpdateTaskTemplate(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid template ID",
		})
	}

	userRole := c.Locals("user_role").(string)
	if userRole != "admin" && userRole != "doctor" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Only admins and doctors can update templates",
		})
	}

	var template models.TaskTemplate
	if err := config.DB.First(&template, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Template not found",
		})
	}

	var req UpdateTaskTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Name != nil {
		template.Name = *req.Name
	}
	if req.Description != nil {
		template.Description = *req.Description
	}
	if req.Title != nil {
		template.Title = *req.Title
	}
	if req.TaskDescription != nil {
		template.TaskDescription = *req.TaskDescription
	}
	if req.Priority != nil {
		template.Priority = models.TaskPriority(*req.Priority)
	}
	if req.DaysUntilDue != nil {
		template.DaysUntilDue = req.DaysUntilDue
	}

	if err := config.DB.Save(&template).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update template",
		})
	}

	if req.TagIDs != nil {
		var tags []models.Tag
		config.DB.Find(&tags, req.TagIDs)
		config.DB.Model(&template).Association("Tags").Replace(tags)
	}

	config.DB.Preload("Tags").First(&template, template.ID)

	return c.JSON(template)
}

// DeleteTaskTemplate deletes a task template
func DeleteTaskTemplate(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid template ID",
		})
	}

	userRole := c.Locals("user_role").(string)
	if userRole != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Only admins can delete templates",
		})
	}

	var template models.TaskTemplate
	if err := config.DB.First(&template, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Template not found",
		})
	}

	// Check if any tasks exist with this template
	var taskCount int64
	if err := config.DB.Model(&models.Task{}).Where("template_id = ?", id).Count(&taskCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check template usage",
		})
	}

	if taskCount > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": fmt.Sprintf("Cannot delete template: %d task(s) are using this template. Delete the tasks first.", taskCount),
		})
	}

	if err := config.DB.Delete(&template).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete template",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// CreateTaskFromTemplate creates a new task from a template
func CreateTaskFromTemplate(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid template ID",
		})
	}

	// Safely get user_id from context
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

	var template models.TaskTemplate
	if err := config.DB.Preload("Tags").First(&template, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Template not found",
		})
	}

	var req CreateTaskFromTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	task := models.Task{
		Title:        template.Title,
		Description:  template.TaskDescription,
		Status:       models.TaskStatusPending,
		Priority:     template.Priority,
		PatientID:    req.PatientID,
		AssignedToID: req.AssignedToID,
		CreatedByID:  userID,
	}

	// Calculate due date if template specifies days
	if template.DaysUntilDue != nil {
		dueDate := time.Now().AddDate(0, 0, *template.DaysUntilDue)
		task.DueDate = &dueDate
	}

	if err := config.DB.Create(&task).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create task",
		})
	}

	// Copy tags from template
	if len(template.Tags) > 0 {
		config.DB.Model(&task).Association("Tags").Append(template.Tags)
	}

	config.DB.Preload("Patient").Preload("AssignedTo").Preload("CreatedBy").Preload("Tags").First(&task, task.ID)

	return c.Status(fiber.StatusCreated).JSON(task)
}

// AssignTemplateToPatient assigns a task template to a specific patient, creating a task
func AssignTemplateToPatient(c *fiber.Ctx) error {
	templateID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid template ID",
		})
	}

	var req AssignTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get the template
	var template models.TaskTemplate
	if err := config.DB.Preload("Tags").First(&template, templateID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Template not found",
		})
	}

	// Safely get user_id from context
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

	// Calculate due date
	var dueDate *time.Time
	if req.DueDate != "" {
		parsed, err := time.Parse("2006-01-02", req.DueDate)
		if err == nil {
			dueDate = &parsed
		}
	} else if template.DaysUntilDue != nil {
		calculated := time.Now().AddDate(0, 0, *template.DaysUntilDue)
		dueDate = &calculated
	}

	// Create task from template
	var patientID *uint
	if req.PatientID != 0 {
		pid := uint(req.PatientID)
		patientID = &pid
	}

	templateIDUint := uint(templateID)

	task := models.Task{
		Title:       template.Title,
		Description: template.TaskDescription,
		Status:      models.TaskStatusPending,
		Priority:    template.Priority,
		PatientID:   patientID,
		CreatedByID: userID,
		DueDate:     dueDate,
		TemplateID:  &templateIDUint,
	}

	if err := config.DB.Create(&task).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create task",
		})
	}

	// Associate tags
	if len(template.Tags) > 0 {
		if err := config.DB.Model(&task).Association("Tags").Append(template.Tags); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to associate tags",
			})
		}
	}

	// Load the created task with associations
	config.DB.Preload("Patient").Preload("AssignedTo").Preload("CreatedBy").Preload("Tags").First(&task, task.ID)

	return c.Status(fiber.StatusCreated).JSON(task)
}

// GetPatientsWithTemplate returns a list of patient IDs who have tasks from a specific template
func GetPatientsWithTemplate(c *fiber.Ctx) error {
	templateID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid template ID",
		})
	}

	var patientIDs []uint
	err = config.DB.Model(&models.Task{}).
		Where("template_id = ? AND patient_id IS NOT NULL", templateID).
		Distinct("patient_id").
		Pluck("patient_id", &patientIDs).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch patients with template",
		})
	}

	return c.JSON(fiber.Map{
		"patientIds": patientIDs,
	})
}
