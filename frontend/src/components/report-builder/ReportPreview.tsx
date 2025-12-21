import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DonutChart } from '@/components/charts/DonutChart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { type ReportResult, type ReportDefinition, type ChartData } from './types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReportPreviewProps {
  result: ReportResult;
  definition: ReportDefinition;
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  result,
  definition,
  onExport,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Handle case when only aggregation fields are selected (no table data)
  const rows = result.rows || [];
  const columns = result.columns || [];
  
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = rows.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const formatCellValue = (value: any, columnName: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }

    // Check if it's a date field
    if (columnName.toLowerCase().includes('date') || columnName.toLowerCase().includes('_at')) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }

    // Check if it's a boolean
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }

    // Truncate long strings
    if (typeof value === 'string' && value.length > 50) {
      return (
        <span title={value}>
          {value.substring(0, 50)}...
        </span>
      );
    }

    return value.toString();
  };

  return (
    <div className="space-y-6">
      {/* Report Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{definition.name || 'Untitled Report'}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {definition.description || 'Custom report preview'}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport('csv')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('excel')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('pdf')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Database className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Rows</p>
                <p className="text-2xl font-bold">{result.totalRows}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Table className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Columns</p>
                <p className="text-2xl font-bold">{columns.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Execution Time</p>
                <p className="text-2xl font-bold">{result.executionTime}ms</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      {result.charts && result.charts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.charts.map((chartData) => {
            const fieldLabel = definition.selectedFields.find(f => f.id === chartData.fieldId)?.label || 'Chart';
            return (
              <DonutChart
                key={chartData.fieldId}
                title={fieldLabel}
                slices={chartData.data.map(d => ({ label: d.label, count: d.count }))}
              />
            );
          })}
        </div>
      )}

      {/* Data Table */}
      {rows.length > 0 && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Results</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, result.totalRows)} of{' '}
                {result.totalRows} rows
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 bg-muted/50">#</TableHead>
                  {result.columns.map((column, index) => (
                    <TableHead key={index} className="font-semibold bg-muted/50">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={result.columns.length + 1}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentRows.map((row, rowIndex) => (
                    <TableRow key={startIndex + rowIndex}>
                      <TableCell className="font-medium text-muted-foreground">
                        {startIndex + rowIndex + 1}
                      </TableCell>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {formatCellValue(cell, result.columns[cellIndex])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Applied Filters Summary */}
      {definition.filters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Applied Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {definition.filters.map((filter, index) => (
                <div
                  key={filter.id}
                  className="flex items-center gap-2 text-sm p-2 bg-secondary rounded-md"
                >
                  {index > 0 && filter.logicalOperator && (
                    <Badge variant="outline" className="font-mono">
                      {filter.logicalOperator}
                    </Badge>
                  )}
                  <span className="font-medium">{filter.field.label}</span>
                  <Badge variant="secondary">{filter.operator}</Badge>
                  {!['is_null', 'is_not_null'].includes(filter.operator) && (
                    <span className="text-muted-foreground">
                      {typeof filter.value === 'object'
                        ? JSON.stringify(filter.value)
                        : filter.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};