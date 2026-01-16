import { useState, useEffect } from 'react';
import { type ReportDefinition, type ReportResult, type ReportField } from '@/components/report-builder/types';
import { reportBuilderService } from '@/services/reportBuilderService';
import { tagService, type Tag } from '@/services/tagService';

export const useReportBuilder = () => {
  const [reportDefinition, setReportDefinition] = useState<ReportDefinition>({
    name: '',
    selectedFields: [],
    filters: [],
  });

  const [availableFields, setAvailableFields] = useState<ReportField[]>([]);
  const [patientTags, setPatientTags] = useState<Tag[]>([]);
  const [savedReports, setSavedReports] = useState<ReportDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableFields();
    loadPatientTags();
    loadSavedReports();
  }, []);

  const loadAvailableFields = async () => {
    try {
      const fields = await reportBuilderService.getAvailableFields();
      setAvailableFields(fields);
    } catch (error) {
      console.error('Failed to load fields:', error);
    }
  };

  const loadPatientTags = async () => {
    try {
      const tags = await tagService.getAll('patient');
      setPatientTags(tags);
    } catch (error) {
      console.error('Failed to load patient tags:', error);
    }
  };

  const loadSavedReports = async () => {
    try {
      const reports = await reportBuilderService.getSavedReports();
      setSavedReports(reports);
    } catch (error) {
      console.error('Failed to load saved reports:', error);
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
      await loadSavedReports(); // Reload saved reports after saving
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (reportId: string): Promise<void> => {
    setLoading(true);
    try {
      const report = await reportBuilderService.getReportById(reportId);
      setReportDefinition(report);
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (reportId: string): Promise<void> => {
    setLoading(true);
    try {
      await reportBuilderService.deleteReport(reportId);
      await loadSavedReports(); // Reload saved reports after deleting
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
};