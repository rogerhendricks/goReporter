import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
<<<<<<< Updated upstream
import { Search, Database, Table, FileText, CheckSquare } from 'lucide-react';
=======
import { Search, Database, Table as TableIcon, FileText, CheckSquare } from 'lucide-react';
>>>>>>> Stashed changes
import { type ReportField } from './types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FieldSelectorProps {
  availableFields: ReportField[];
  selectedFields: ReportField[];
  onFieldSelect: (field: ReportField) => void;
}

<<<<<<< Updated upstream
export const FieldSelector: React.FC<FieldSelectorProps> = ({
  availableFields,
  selectedFields,
  onFieldSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Group fields by table
=======
export function FieldSelector({
  availableFields,
  selectedFields,
  onFieldSelect,
}: FieldSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

>>>>>>> Stashed changes
  const groupedFields = availableFields.reduce((acc, field) => {
    if (!acc[field.table]) {
      acc[field.table] = [];
    }
    acc[field.table].push(field);
    return acc;
  }, {} as Record<string, ReportField[]>);

<<<<<<< Updated upstream
  // Filter fields based on search
=======
>>>>>>> Stashed changes
  const filteredGroups = Object.entries(groupedFields).reduce((acc, [table, fields]) => {
    const filteredFields = fields.filter(
      (field) =>
        field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredFields.length > 0) {
      acc[table] = filteredFields;
    }
    return acc;
  }, {} as Record<string, ReportField[]>);

  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case 'patients':
        return <Database className="h-4 w-4" />;
      case 'devices':
<<<<<<< Updated upstream
        return <Table className="h-4 w-4" />;
=======
        return <TableIcon className="h-4 w-4" />;
>>>>>>> Stashed changes
      case 'reports':
        return <FileText className="h-4 w-4" />;
      case 'tasks':
        return <CheckSquare className="h-4 w-4" />;
<<<<<<< Updated upstream
      case 'analytics':
        return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 2v10l6 3.5"/></svg>;
      default:
        return <Table className="h-4 w-4" />;
=======
      default:
        return <TableIcon className="h-4 w-4" />;
>>>>>>> Stashed changes
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'bg-blue-500/10 text-blue-500';
      case 'number':
        return 'bg-green-500/10 text-green-500';
      case 'date':
        return 'bg-purple-500/10 text-purple-500';
      case 'boolean':
        return 'bg-orange-500/10 text-orange-500';
<<<<<<< Updated upstream
      case 'aggregation':
        return 'bg-pink-500/10 text-pink-500';
=======
>>>>>>> Stashed changes
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const isFieldSelected = (fieldId: string) => {
    return selectedFields.some((f) => f.id === fieldId);
  };

  const formatTableName = (table: string) => {
    return table.charAt(0).toUpperCase() + table.slice(1);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Available Fields</CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="overflow-y-auto max-h-[calc(100vh-300px)]">
        <Accordion type="multiple" defaultValue={Object.keys(groupedFields)} className="w-full">
          {Object.entries(filteredGroups).map(([table, fields]) => (
            <AccordionItem key={table} value={table}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  {getTableIcon(table)}
                  <span className="font-semibold">{formatTableName(table)}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {fields.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 pl-6">
                  {fields.map((field) => (
                    <Button
                      key={field.id}
                      variant={isFieldSelected(field.id) ? 'secondary' : 'ghost'}
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => onFieldSelect(field)}
                      disabled={isFieldSelected(field.id)}
                    >
                      <div className="flex flex-col items-start gap-1 w-full">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-medium">{field.label}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getTypeColor(field.type)}`}
                          >
                            {field.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {field.name}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {Object.keys(filteredGroups).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No fields found</p>
            <p className="text-xs mt-1">Try adjusting your search</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
<<<<<<< Updated upstream
};
=======
}
>>>>>>> Stashed changes
