import { useState, useEffect } from 'react';
import { type ReportDefinition, type ReportResult, type ReportField } from '@/components/report-builder/types';
import { reportBuilderService } from '@/services/reportBuilderService';

export const useReportBuilder = () => {
  const [reportDefinition, setReportDefinition] = useState<ReportDefinition>({
    name: '',
    selectedFields: [],
    filters: [],
  });

  const [availableFields, setAvailableFields] = useState<ReportField[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableFields();
  }, []);

  const loadAvailableFields = async () => {
    try {
      const fields = await reportBuilderService.getAvailableFields();
      setAvailableFields(fields);
    } catch (error) {
      console.error('Failed to load fields:', error);
    }
  };

  const executeReport = async (
    definition: ReportDefinition
  ): Promise<ReportResult> => {
    setLoading(true);
    try {
      const result = await reportBuilderService.executeReport(definition);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async (definition: ReportDefinition): Promise<void> => {
    setLoading(true);
    try {
      await reportBuilderService.saveReport(definition);
    } finally {
      setLoading(false);
    }
  };

  return {
    reportDefinition,
    setReportDefinition,
    availableFields,
    executeReport,
    saveReport,
    loading,
  };
};