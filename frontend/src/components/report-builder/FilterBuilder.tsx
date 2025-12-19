import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {type FilterCondition, type ReportField } from './types';
import { FilterRow } from './FilterRow';

interface FilterBuilderProps {
  filters: FilterCondition[];
  availableFields: ReportField[];
  onFiltersChange: (filters: FilterCondition[]) => void;
}

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  filters,
  availableFields,
  onFiltersChange,
}) => {
  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: Date.now().toString(),
      field: availableFields[0],
      operator: 'equals',
      value: '',
      logicalOperator: filters.length > 0 ? 'AND' : undefined,
    };
    onFiltersChange([...filters, newFilter]);
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    onFiltersChange(
      filters.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Filters</CardTitle>
        <Button onClick={addFilter} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Filter
        </Button>
      </CardHeader>
      <CardContent>
        {filters.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No filters added. Click "Add Filter" to create conditions.
          </p>
        ) : (
          <div className="space-y-4">
            {filters.map((filter, index) => (
              <FilterRow
                key={filter.id}
                filter={filter}
                availableFields={availableFields}
                showLogicalOperator={index > 0}
                onUpdate={(updates) => updateFilter(filter.id, updates)}
                onRemove={() => removeFilter(filter.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};