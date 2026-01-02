import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { type FilterCondition, type ReportField } from './types';

interface FilterRowProps {
  filter: FilterCondition;
  availableFields: ReportField[];
  patientTags?: Array<{ ID: number; name: string }>;
  showLogicalOperator: boolean;
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
}

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'between', label: 'Between' },
  { value: 'in', label: 'In List' },
  { value: 'is_null', label: 'Is Null' },
  { value: 'is_not_null', label: 'Is Not Null' },
];

export const FilterRow: React.FC<FilterRowProps> = ({
  filter,
  availableFields,
  patientTags,
  showLogicalOperator,
  onUpdate,
  onRemove,
}) => {
  const getOperatorsForType = (type: string) => {
    switch (type) {
      case 'string':
        return OPERATORS.filter((op) =>
          ['equals', 'not_equals', 'contains', 'starts_with', 'in', 'is_null', 'is_not_null'].includes(op.value)
        );
      case 'number':
        return OPERATORS.filter((op) =>
          ['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'is_null', 'is_not_null'].includes(op.value)
        );
      case 'date':
        return OPERATORS.filter((op) =>
          ['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'is_null', 'is_not_null'].includes(op.value)
        );
      case 'boolean':
        return OPERATORS.filter((op) =>
          ['equals', 'is_null', 'is_not_null'].includes(op.value)
        );
      default:
        return OPERATORS;
    }
  };

  const renderValueInput = () => {
    if (['is_null', 'is_not_null'].includes(filter.operator)) {
      return null;
    }

  // Special-case: Tag Name filter should be a dropdown of patient tags.
  if (
    filter.field.table === 'tags' &&
    filter.field.name === 'name' &&
    (patientTags?.length ?? 0) > 0 &&
    ['equals', 'not_equals'].includes(filter.operator)
  ) {
    return (
      <Select
        value={(filter.value ?? '').toString()}
        onValueChange={(value) => onUpdate({ value })}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select tag" />
        </SelectTrigger>
        <SelectContent>
          {patientTags!.map((t) => (
            <SelectItem key={t.ID} value={t.name}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

    switch (filter.field.type) {
      case 'boolean':
        return (
          <Select
            value={filter.value?.toString()}
            onValueChange={(value) => onUpdate({ value: value === 'true' })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={filter.value || ''}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="w-[180px]"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={filter.value || ''}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Enter value"
            className="w-[180px]"
          />
        );
      default:
        return (
          <Input
            type="text"
            value={filter.value || ''}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Enter value"
            className="w-[180px]"
          />
        );
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {/* Logical Operator */}
        {showLogicalOperator && (
          <Select
            value={filter.logicalOperator}
            onValueChange={(value) =>
              onUpdate({ logicalOperator: value as 'AND' | 'OR' })
            }
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Field Selector */}
        <Select
          value={filter.field.id}
          onValueChange={(value) => {
            const field = availableFields.find((f) => f.id === value);
            if (field) onUpdate({ field });
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {availableFields.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator Selector */}
        <Select
          value={filter.operator}
          onValueChange={(value) => onUpdate({ operator: value as any })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getOperatorsForType(filter.field.type).map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value Input */}
        {renderValueInput()}

        {/* Remove Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="ml-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};