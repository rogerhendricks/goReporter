import React, { useState } from 'react';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayCircle, Save, FolderOpen, Trash2, Calendar } from 'lucide-react';
import { FieldSelector } from './FieldSelector';
import { FilterBuilder } from './FilterBuilder';
import { ReportPreview } from './ReportPreview';
import { SortableItem } from '@/components/ui/sortable-list';
import { type ReportResult, type ReportField } from './types';
import { useReportBuilder } from '@/hooks/useReportBuilder';
import { reportBuilderService } from '@/services/reportBuilderService';
import { toast } from 'sonner';

export const ReportBuilder: React.FC = () => {
  const {
    reportDefinition,
    setReportDefinition,
    availableFields,
    patientTags,
    savedReports,
    executeReport,
    saveReport,
    loadReport,
    deleteReport,
    loading,
  } = useReportBuilder();

  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [activeTab, setActiveTab] = useState('design');

  const handleFieldSelect = (field: ReportField) => {
    if (!reportDefinition.selectedFields.find((f) => f.id === field.id)) {
      setReportDefinition({
        ...reportDefinition,
        selectedFields: [...reportDefinition.selectedFields, field],
      });
    }
  };

  const handleFieldRemove = (fieldId: string) => {
    setReportDefinition({
      ...reportDefinition,
      selectedFields: reportDefinition.selectedFields.filter((f) => f.id !== fieldId),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = reportDefinition.selectedFields.findIndex(
        (f) => f.id === active.id
      );
      const newIndex = reportDefinition.selectedFields.findIndex((f) => f.id === over.id);

      setReportDefinition({
        ...reportDefinition,
        selectedFields: arrayMove(reportDefinition.selectedFields, oldIndex, newIndex),
      });
    }
  };

  const handleRunReport = async () => {
    try {
      const result = await executeReport(reportDefinition);
      setReportResult(result);
      setActiveTab('preview');
      toast.success(`Report generated with ${result.totalRows} rows`);
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  const handleSaveReport = async () => {
    if (!reportDefinition.name.trim()) {
      toast.error('Please enter a report name before saving');
      return;
    }
    try {
      await saveReport(reportDefinition);
      toast.success('Report saved successfully');
    } catch (error) {
      toast.error('Failed to save report');
    }
  };

  const handleLoadReport = async (reportId: string) => {
    try {
      await loadReport(reportId);
      toast.success('Report loaded successfully');
    } catch (error) {
      toast.error('Failed to load report');
    }
  };

  const handleDeleteReport = async (reportId: string, reportName: string) => {
    if (window.confirm(`Are you sure you want to delete "${reportName}"?`)) {
      try {
        await deleteReport(reportId);
        toast.success('Report deleted successfully');
      } catch (error) {
        toast.error('Failed to delete report');
      }
    }
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (!reportResult) {
      toast.error('Please run the report first before exporting');
      return;
    }

    try {
      toast.info(`Exporting as ${format.toUpperCase()}...`);
      
      let blob: Blob;
      let filename: string;
      const timestamp = new Date().toISOString().split('T')[0];
      const reportName = reportDefinition.name || 'report';
      
      switch (format) {
        case 'csv':
          blob = await reportBuilderService.exportToCSV(reportDefinition);
          filename = `${reportName}_${timestamp}.csv`;
          break;
        case 'excel':
          blob = await reportBuilderService.exportToExcel(reportDefinition);
          filename = `${reportName}_${timestamp}.xlsx`;
          break;
        case 'pdf':
          // Generate PDF on frontend using pdf-lib
          blob = await reportBuilderService.generatePDF(
            reportResult,
            reportDefinition.name || 'Custom Report',
            reportDefinition.description
          );
          filename = `${reportName}_${timestamp}.pdf`;
          break;
      }
      
      reportBuilderService.downloadFile(blob, filename);
      toast.success(`Report exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export report as ${format.toUpperCase()}`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Custom Report Builder</h1>
          <p className="text-muted-foreground">
            Create custom reports with drag-and-drop filters
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSaveReport} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Save Report
          </Button>
          <Button onClick={handleRunReport} disabled={loading}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Run Report
          </Button>
        </div>
      </div>

      {/* Report Name */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Report Name</label>
            <Input
              placeholder="Enter report name..."
              value={reportDefinition.name}
              onChange={(e) =>
                setReportDefinition({ ...reportDefinition, name: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports ({savedReports.length})</TabsTrigger>
          <TabsTrigger value="preview" disabled={!reportResult}>
            Preview
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="space-y-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel - Available Fields */}
            <div className="col-span-3">
              <FieldSelector
                availableFields={availableFields}
                selectedFields={reportDefinition.selectedFields}
                onFieldSelect={handleFieldSelect}
              />
            </div>

            {/* Center Panel - Report Design */}
            <div className="col-span-9 space-y-6">
              {/* Selected Fields with Drag-and-Drop */}
              <Card>
                <CardHeader>
                  <CardTitle>Selected Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportDefinition.selectedFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Click fields from the left panel to add them to your report
                    </p>
                  ) : (
                    <DndContext
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={reportDefinition.selectedFields.map((f) => f.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {reportDefinition.selectedFields.map((field) => (
                            <SortableItem key={field.id} id={field.id}>
                              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg flex-1">
                                <div>
                                  <p className="font-medium">{field.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {field.table}.{field.name}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleFieldRemove(field.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </SortableItem>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </CardContent>
              </Card>

              {/* Filters */}
              <FilterBuilder
                filters={reportDefinition.filters}
                availableFields={availableFields}
                patientTags={patientTags}
                onFiltersChange={(filters) =>
                  setReportDefinition({ ...reportDefinition, filters })
                }
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {savedReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No saved reports yet</p>
                  <p className="text-sm mt-2">Create and save reports to access them here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{report.name}</h3>
                        {report.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {report.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(report.createdAt!).toLocaleDateString()}
                          </span>
                          <span>{report.selectedFields.length} fields</span>
                          <span>{report.filters.length} filters</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadReport(report.id!)}
                          disabled={loading}
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReport(report.id!, report.name)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          {reportResult && (
            <ReportPreview
              result={reportResult}
              definition={reportDefinition}
              onExport={handleExport}
            />
          )}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Report Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Result Limit</label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={reportDefinition.limit || ''}
                  onChange={(e) =>
                    setReportDefinition({
                      ...reportDefinition,
                      limit: parseInt(e.target.value) || undefined,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};