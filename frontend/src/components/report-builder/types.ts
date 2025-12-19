export interface ReportField {
  id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  table: string; // 'patients', 'devices', 'reports', etc.
  aggregatable?: boolean; // Can use COUNT, SUM, AVG, etc.
}

export interface FilterCondition {
  id: string;
  field: ReportField;
  operator: 
    | 'equals' 
    | 'not_equals' 
    | 'contains' 
    | 'starts_with'
    | 'greater_than' 
    | 'less_than'
    | 'between'
    | 'in'
    | 'is_null'
    | 'is_not_null';
  value: any;
  logicalOperator?: 'AND' | 'OR'; // For chaining conditions
}

export interface GroupBy {
  field: ReportField;
  aggregation?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
}

export interface SortBy {
  field: ReportField;
  direction: 'ASC' | 'DESC';
}

export interface ReportDefinition {
  id?: string;
  name: string;
  description?: string;
  selectedFields: ReportField[];
  filters: FilterCondition[];
  groupBy?: GroupBy[];
  sortBy?: SortBy[];
  limit?: number;
  createdBy?: string;
  createdAt?: string;
  isTemplate?: boolean;
}

export interface ReportResult {
  columns: string[];
  rows: any[][];
  totalRows: number;
  executionTime: number;
}