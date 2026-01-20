package services

import (
	"fmt"
	"strings"

	"github.com/rogerhendricks/goReporter/internal/models"
)

type QueryBuilder struct {
	allowedTables map[string][]string // table -> allowed columns
}

func NewQueryBuilder() *QueryBuilder {
	return &QueryBuilder{
		allowedTables: map[string][]string{
			"patients":          {"id", "first_name", "last_name", "date_of_birth", "mrn", "tags", "created_at", "updated_at"},
			"devices":           {"id", "name", "manufacturer", "dev_model", "is_mri", "type", "created_at", "updated_at"},
			"reports":           {"id", "patient_id", "report_date", "report_type", "report_status", "current_heart_rate", "current_rhythm", "created_at", "updated_at"},
			"tasks":             {"id", "patient_id", "title", "description", "due_date", "status", "priority", "created_at", "updated_at"},
			"tags":              {"id", "name", "type", "color", "description", "created_at", "updated_at"},
			"implanted_devices": {"id", "patient_id", "device_id", "serial", "implanted_at", "explanted_at", "status", "created_at", "updated_at"},
			"implanted_leads":   {"id", "patient_id", "lead_id", "serial", "chamber", "implanted_at", "explanted_at", "status", "created_at", "updated_at"},
		},
	}
}

func (qb *QueryBuilder) BuildQuery(definition models.ReportDef) (string, []interface{}, error) {
	// Validate fields
	if err := qb.validateFields(definition.SelectedFields); err != nil {
		return "", nil, err
	}

	// Validate filter fields
	for _, filter := range definition.Filters {
		if err := qb.validateFields([]models.ReportField{filter.Field}); err != nil {
			return "", nil, err
		}
	}

	var query strings.Builder
	var args []interface{}
	argIndex := 1

	// SELECT clause
	query.WriteString("SELECT ")
	selectClauses := make([]string, 0, len(definition.SelectedFields))
	for _, field := range definition.SelectedFields {
		if field.Table == "patients" && field.Name == "tags" {
			selectClauses = append(selectClauses, qb.patientTagsSelectExpr())
			continue
		}
		selectClauses = append(selectClauses, fmt.Sprintf("%s.%s", field.Table, field.Name))
	}
	query.WriteString(strings.Join(selectClauses, ", "))

	// FROM clause - determine primary table
	primaryTable := qb.determinePrimaryTable(definition.SelectedFields)
	query.WriteString(fmt.Sprintf(" FROM %s", primaryTable))

	// JOIN clauses - auto-detect needed joins based on selected fields AND filters
	allFields := append([]models.ReportField{}, definition.SelectedFields...)
	for _, filter := range definition.Filters {
		allFields = append(allFields, filter.Field)
	}
	joins := qb.determineJoins(allFields, primaryTable)
	for _, join := range joins {
		query.WriteString(" ")
		query.WriteString(join)
	}

	// WHERE clause
	if len(definition.Filters) > 0 {
		whereClause, whereArgs, err := qb.buildWhereClause(definition.Filters, &argIndex)
		if err != nil {
			return "", nil, err
		}
		query.WriteString(" WHERE ")
		query.WriteString(whereClause)
		args = append(args, whereArgs...)
	}

	// GROUP BY clause
	if len(definition.GroupBy) > 0 {
		query.WriteString(" GROUP BY ")
		groupClauses := make([]string, 0, len(definition.GroupBy))
		for _, gb := range definition.GroupBy {
			groupClauses = append(groupClauses, fmt.Sprintf("%s.%s", gb.Field.Table, gb.Field.Name))
		}
		query.WriteString(strings.Join(groupClauses, ", "))
	}

	// ORDER BY clause
	if len(definition.SortBy) > 0 {
		query.WriteString(" ORDER BY ")
		sortClauses := make([]string, 0, len(definition.SortBy))
		for _, sb := range definition.SortBy {
			sortClauses = append(sortClauses, fmt.Sprintf("%s.%s %s", sb.Field.Table, sb.Field.Name, sb.Direction))
		}
		query.WriteString(strings.Join(sortClauses, ", "))
	}

	// LIMIT clause
	if definition.Limit > 0 {
		query.WriteString(fmt.Sprintf(" LIMIT %d", definition.Limit))
	}

	return query.String(), args, nil
}

func (qb *QueryBuilder) buildWhereClause(filters []models.FilterCondition, argIndex *int) (string, []interface{}, error) {
	var parts []string
	var args []interface{}

	for i, filter := range filters {
		clause, filterArgs, err := qb.buildFilterClause(filter, argIndex)
		if err != nil {
			return "", nil, err
		}

		if i > 0 {
			// Use the logical operator from the current filter, default to AND
			operator := "AND"
			if filter.LogicalOperator != "" {
				operator = filter.LogicalOperator
			}
			parts = append(parts, operator)
		}
		parts = append(parts, clause)
		args = append(args, filterArgs...)
	}

	return strings.Join(parts, " "), args, nil
}

func (qb *QueryBuilder) buildFilterClause(filter models.FilterCondition, argIndex *int) (string, []interface{}, error) {
	if filter.Field.Table == "patients" && filter.Field.Name == "tags" {
		return qb.buildPatientTagsFilterClause(filter, argIndex)
	}

	field := fmt.Sprintf("%s.%s", filter.Field.Table, filter.Field.Name)
	var clause string
	var args []interface{}

	switch filter.Operator {
	case "equals":
		clause = fmt.Sprintf("%s = $%d", field, *argIndex)
		args = append(args, filter.Value)
		*argIndex++
	case "not_equals":
		clause = fmt.Sprintf("%s != $%d", field, *argIndex)
		args = append(args, filter.Value)
		*argIndex++
	case "contains":
		clause = fmt.Sprintf("%s ILIKE $%d", field, *argIndex)
		args = append(args, "%"+fmt.Sprint(filter.Value)+"%")
		*argIndex++
	case "starts_with":
		clause = fmt.Sprintf("%s ILIKE $%d", field, *argIndex)
		args = append(args, fmt.Sprint(filter.Value)+"%")
		*argIndex++
	case "greater_than":
		clause = fmt.Sprintf("%s > $%d", field, *argIndex)
		args = append(args, filter.Value)
		*argIndex++
	case "less_than":
		clause = fmt.Sprintf("%s < $%d", field, *argIndex)
		args = append(args, filter.Value)
		*argIndex++
	case "is_null":
		clause = fmt.Sprintf("%s IS NULL", field)
	case "is_not_null":
		clause = fmt.Sprintf("%s IS NOT NULL", field)
	default:
		return "", nil, fmt.Errorf("unsupported operator: %s", filter.Operator)
	}

	return fmt.Sprintf("(%s)", clause), args, nil
}

func (qb *QueryBuilder) patientTagsSelectExpr() string {
	// Returns a comma-separated list of tag names for a patient.
	// Uses a correlated subquery to avoid row-multiplication in the main query.
	return "COALESCE((SELECT STRING_AGG(t.name, ', ' ORDER BY t.name) FROM patient_tags pt JOIN tags t ON t.id = pt.tag_id AND t.deleted_at IS NULL AND t.type = 'patient' WHERE pt.patient_id = patients.id), '') AS patient_tags"
}

func (qb *QueryBuilder) buildPatientTagsFilterClause(filter models.FilterCondition, argIndex *int) (string, []interface{}, error) {
	// Filter patients by tag name using EXISTS against patient_tags/tags.
	// This keeps the main query shape stable and works regardless of other joins.
	base := "SELECT 1 FROM patient_tags pt JOIN tags t ON t.id = pt.tag_id AND t.deleted_at IS NULL AND t.type = 'patient' WHERE pt.patient_id = patients.id"

	switch filter.Operator {
	case "equals":
		clause := fmt.Sprintf("EXISTS (%s AND t.name = $%d)", base, *argIndex)
		args := []interface{}{filter.Value}
		*argIndex++
		return fmt.Sprintf("(%s)", clause), args, nil
	case "not_equals":
		clause := fmt.Sprintf("NOT EXISTS (%s AND t.name = $%d)", base, *argIndex)
		args := []interface{}{filter.Value}
		*argIndex++
		return fmt.Sprintf("(%s)", clause), args, nil
	case "contains":
		clause := fmt.Sprintf("EXISTS (%s AND t.name ILIKE $%d)", base, *argIndex)
		args := []interface{}{"%" + fmt.Sprint(filter.Value) + "%"}
		*argIndex++
		return fmt.Sprintf("(%s)", clause), args, nil
	case "starts_with":
		clause := fmt.Sprintf("EXISTS (%s AND t.name ILIKE $%d)", base, *argIndex)
		args := []interface{}{fmt.Sprint(filter.Value) + "%"}
		*argIndex++
		return fmt.Sprintf("(%s)", clause), args, nil
	case "is_null":
		return fmt.Sprintf("(NOT EXISTS (%s))", base), nil, nil
	case "is_not_null":
		return fmt.Sprintf("(EXISTS (%s))", base), nil, nil
	default:
		return "", nil, fmt.Errorf("unsupported operator for patient tags: %s", filter.Operator)
	}
}

func (qb *QueryBuilder) validateFields(fields []models.ReportField) error {
	for _, field := range fields {
		allowedColumns, exists := qb.allowedTables[field.Table]
		if !exists {
			return fmt.Errorf("table not allowed: %s", field.Table)
		}

		found := false
		for _, col := range allowedColumns {
			if col == field.Name {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("column not allowed: %s.%s", field.Table, field.Name)
		}
	}
	return nil
}

func (qb *QueryBuilder) determinePrimaryTable(fields []models.ReportField) string {
	if len(fields) == 0 {
		return "patients"
	}
	return fields[0].Table
}

func (qb *QueryBuilder) determineJoins(fields []models.ReportField, primaryTable string) []string {
	tables := make(map[string]bool)
	for _, field := range fields {
		tables[field.Table] = true
	}

	var joins []string

	// Handle devices and/or implanted_devices - both require joining through implanted_devices
	if primaryTable == "patients" && (tables["devices"] || tables["implanted_devices"]) {
		// Add implanted_devices join if needed
		if tables["devices"] || tables["implanted_devices"] {
			joins = append(joins, "LEFT JOIN implanted_devices ON patients.id = implanted_devices.patient_id")
		}
		// Add devices join only if devices table is referenced
		if tables["devices"] {
			joins = append(joins, "LEFT JOIN devices ON implanted_devices.device_id = devices.id")
		}
	}

	// Handle implanted_leads table
	if primaryTable != "implanted_leads" && tables["implanted_leads"] {
		if primaryTable == "patients" {
			joins = append(joins, "LEFT JOIN implanted_leads ON patients.id = implanted_leads.patient_id")
		}
	}

	// Reports have direct patient_id foreign key
	if primaryTable != "reports" && tables["reports"] {
		joins = append(joins, "LEFT JOIN reports ON patients.id = reports.patient_id")
	}

	// Tasks have direct patient_id foreign key
	if primaryTable != "tasks" && tables["tasks"] {
		joins = append(joins, "LEFT JOIN tasks ON patients.id = tasks.patient_id")
	}

	// Tags (many-to-many) via patient_tags
	// Primary use-case: patient-based reports where each (patient, tag) can be a row.
	if tables["tags"] {
		switch primaryTable {
		case "patients":
			joins = append(joins, "LEFT JOIN patient_tags ON patients.id = patient_tags.patient_id")
			joins = append(joins, "LEFT JOIN tags ON patient_tags.tag_id = tags.id AND tags.deleted_at IS NULL AND tags.type = 'patient'")
		case "tags":
			joins = append(joins, "LEFT JOIN patient_tags ON tags.id = patient_tags.tag_id")
			joins = append(joins, "LEFT JOIN patients ON patient_tags.patient_id = patients.id")
		}
	}

	return joins
}
