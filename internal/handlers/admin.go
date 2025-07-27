package handlers

import (
	"github.com/gofiber/fiber/v2"
	"net/http"
)

// GetAllAdmins retrieves all admin users
func GetAllAdmins(c *fiber.Ctx) error {
	// Logic to retrieve all admins
	return c.Status(http.StatusOK).JSON(fiber.Map{
		"message": "Retrieve all admins",
	})
}

// CreateAdmin creates a new admin user
func CreateAdmin(c *fiber.Ctx) error {
	// Logic to create a new admin
	return c.Status(http.StatusCreated).JSON(fiber.Map{
		"message": "Admin created successfully",
	})
}

// UpdateAdmin updates an existing admin user
func UpdateAdmin(c *fiber.Ctx) error {
	adminID := c.Params("id")
	// Logic to update the admin with the given ID
	return c.Status(http.StatusOK).JSON(fiber.Map{
		"message": "Admin updated successfully",
		"id":      adminID,
	})
}

// DeleteAdmin deletes an admin user
func DeleteAdmin(c *fiber.Ctx) error {
	adminID := c.Params("id")
	// Logic to delete the admin with the given ID
	return c.Status(http.StatusOK).JSON(fiber.Map{
		"message": "Admin deleted successfully",
		"id":      adminID,
	})
}