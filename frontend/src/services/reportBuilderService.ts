import axios from 'axios';
import { type ReportDefinition, type ReportResult, type ReportField } from '@/components/report-builder/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

class ReportBuilderService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add token to requests if available
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors globally
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all available fields that can be used in reports
   */
  async getAvailableFields(): Promise<ReportField[]> {
    try {
      const response = await this.api.get<ReportField[]>('/report-builder/fields');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch available fields:', error);
      throw new Error('Failed to load available fields');
    }
  }

  /**
   * Execute a report and get results
   */
  async executeReport(definition: ReportDefinition): Promise<ReportResult> {
    try {
      const response = await this.api.post<ReportResult>('/report-builder/execute', {
        selected_fields: definition.selectedFields,
        filters: definition.filters,
        group_by: definition.groupBy,
        sort_by: definition.sortBy,
        limit: definition.limit,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to execute report:', error);
      throw new Error('Failed to execute report');
    }
  }

  /**
   * Save a report definition
   */
  async saveReport(definition: ReportDefinition): Promise<{ id: number }> {
    try {
      const response = await this.api.post<{ id: number }>('/report-builder/reports', {
        name: definition.name,
        description: definition.description,
        definition: {
          selected_fields: definition.selectedFields,
          filters: definition.filters,
          group_by: definition.groupBy,
          sort_by: definition.sortBy,
          limit: definition.limit,
        },
        is_template: definition.isTemplate || false,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to save report:', error);
      throw new Error('Failed to save report');
    }
  }

  /**
   * Get all saved reports for the current user
   */
  async getSavedReports(): Promise<ReportDefinition[]> {
    try {
      const response = await this.api.get<any[]>('/report-builder/reports');
      
      // Transform backend response to ReportDefinition format
      return response.data.map((report) => ({
        id: report.id.toString(),
        name: report.name,
        description: report.description,
        selectedFields: report.definition.selected_fields || [],
        filters: report.definition.filters || [],
        groupBy: report.definition.group_by,
        sortBy: report.definition.sort_by,
        limit: report.definition.limit,
        createdBy: report.created_by?.toString(),
        createdAt: report.created_at,
        isTemplate: report.is_template,
      }));
    } catch (error) {
      console.error('Failed to fetch saved reports:', error);
      throw new Error('Failed to load saved reports');
    }
  }

  /**
   * Get a specific saved report by ID
   */
  async getReportById(id: string): Promise<ReportDefinition> {
    try {
      const response = await this.api.get<any>(`/report-builder/reports/${id}`);
      const report = response.data;
      
      return {
        id: report.id.toString(),
        name: report.name,
        description: report.description,
        selectedFields: report.definition.selected_fields || [],
        filters: report.definition.filters || [],
        groupBy: report.definition.group_by,
        sortBy: report.definition.sort_by,
        limit: report.definition.limit,
        createdBy: report.created_by?.toString(),
        createdAt: report.created_at,
        isTemplate: report.is_template,
      };
    } catch (error) {
      console.error('Failed to fetch report:', error);
      throw new Error('Failed to load report');
    }
  }

  /**
   * Update an existing report
   */
  async updateReport(id: string, definition: ReportDefinition): Promise<void> {
    try {
      await this.api.put(`/report-builder/reports/${id}`, {
        name: definition.name,
        description: definition.description,
        definition: {
          selected_fields: definition.selectedFields,
          filters: definition.filters,
          group_by: definition.groupBy,
          sort_by: definition.sortBy,
          limit: definition.limit,
        },
        is_template: definition.isTemplate || false,
      });
    } catch (error) {
      console.error('Failed to update report:', error);
      throw new Error('Failed to update report');
    }
  }

  /**
   * Delete a saved report
   */
  async deleteReport(id: string): Promise<void> {
    try {
      await this.api.delete(`/report-builder/reports/${id}`);
    } catch (error) {
      console.error('Failed to delete report:', error);
      throw new Error('Failed to delete report');
    }
  }

  /**
   * Export report results to CSV
   */
  async exportToCSV(definition: ReportDefinition): Promise<Blob> {
    try {
      const response = await this.api.post(
        '/report-builder/export/csv',
        {
          selected_fields: definition.selectedFields,
          filters: definition.filters,
          group_by: definition.groupBy,
          sort_by: definition.sortBy,
          limit: definition.limit,
        },
        {
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to export to CSV:', error);
      throw new Error('Failed to export report');
    }
  }

  /**
   * Export report results to Excel
   */
  async exportToExcel(definition: ReportDefinition): Promise<Blob> {
    try {
      const response = await this.api.post(
        '/report-builder/export/excel',
        {
          selected_fields: definition.selectedFields,
          filters: definition.filters,
          group_by: definition.groupBy,
          sort_by: definition.sortBy,
          limit: definition.limit,
        },
        {
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      throw new Error('Failed to export report');
    }
  }

  /**
   * Export report results to PDF
   */
  async exportToPDF(definition: ReportDefinition): Promise<Blob> {
    try {
      const response = await this.api.post(
        '/report-builder/export/pdf',
        {
          selected_fields: definition.selectedFields,
          filters: definition.filters,
          group_by: definition.groupBy,
          sort_by: definition.sortBy,
          limit: definition.limit,
        },
        {
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to export to PDF:', error);
      throw new Error('Failed to export report');
    }
  }

  /**
   * Download a file blob
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const reportBuilderService = new ReportBuilderService();