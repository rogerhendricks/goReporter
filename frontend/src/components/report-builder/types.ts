export interface ReportField {
  id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'aggregation';
  table: string; // 'patients', 'devices', 'reports', etc.
  aggregatable?: boolean; // Can use COUNT, SUM, AVG, etc.
  aggregationType?: 'donut_chart' | 'bar_chart'; // For visualization fields
  groupByField?: string; // The field to group by for aggregations
  aggregationFunction?: 'COUNT' | 'SUM' | 'AVG'; // The function to apply
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

export interface ChartData {
  fieldId: string;
  chartType: 'donut_chart' | 'bar_chart';
  data: Array<{ label: string; count: number }>;
}

export interface ReportResult {
  columns: string[];
  rows: any[][];
  totalRows: number;
  executionTime: number;
  charts?: ChartData[]; // Include chart data for aggregation fields
}