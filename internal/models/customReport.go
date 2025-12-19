package models

import (
    "database/sql/driver"
    "encoding/json"
    "time"
)

type CustomReport struct {
    ID          uint      `gorm:"primarykey" json:"id"`
    Name        string    `gorm:"not null" json:"name"`
    Description string    `json:"description"`
    Definition  ReportDef `gorm:"type:text" json:"definition"`
    CreatedBy   uint      `json:"created_by"`
    User        User      `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
    IsTemplate  bool      `gorm:"default:false" json:"is_template"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type ReportDef struct {
    SelectedFields []ReportField      `json:"selected_fields"`
    Filters        []FilterCondition  `json:"filters"`
    GroupBy        []GroupBy          `json:"group_by,omitempty"`
    SortBy         []SortBy           `json:"sort_by,omitempty"`
    Limit          int                `json:"limit,omitempty"`
}

type ReportField struct {
    ID           string `json:"id"`
    Name         string `json:"name"`
    Label        string `json:"label"`
    Type         string `json:"type"`
    Table        string `json:"table"`
    Aggregatable bool   `json:"aggregatable,omitempty"`
}

type FilterCondition struct {
    ID              string      `json:"id"`
    Field           ReportField `json:"field"`
    Operator        string      `json:"operator"`
    Value           interface{} `json:"value"`
    LogicalOperator string      `json:"logical_operator,omitempty"`
}

type GroupBy struct {
    Field       ReportField `json:"field"`
    Aggregation string      `json:"aggregation,omitempty"`
}

type SortBy struct {
    Field     ReportField `json:"field"`
    Direction string      `json:"direction"`
}

// Implement Scanner and Valuer for GORM JSON storage
func (rd *ReportDef) Scan(value interface{}) error {
    bytes, ok := value.([]byte)
    if !ok {
        return nil
    }
    return json.Unmarshal(bytes, rd)
}

func (rd ReportDef) Value() (driver.Value, error) {
    return json.Marshal(rd)
}