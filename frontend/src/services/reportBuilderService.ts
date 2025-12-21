import api from '@/utils/axios';
import { type ReportDefinition, type ReportResult, type ReportField, type ChartData } from '@/components/report-builder/types';
import { PDFChartGenerator } from './pdfChartGenerator';

class ReportBuilderService {
  /**
   * Get all available fields that can be used in reports
   */
  async getAvailableFields(): Promise<ReportField[]> {
    try {
      const response = await api.get<ReportField[]>('/report-builder/fields');
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
      const response = await api.post<ReportResult>('/report-builder/execute', {
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
      const response = await api.post<{ id: number }>('/report-builder/reports', {
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
      const response = await api.get<any[]>('/report-builder/reports');
      
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
      const response = await api.get<any>(`/report-builder/reports/${id}`);
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
      await api.put(`/report-builder/reports/${id}`, {
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
      await api.delete(`/report-builder/reports/${id}`);
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
      const response = await api.post(
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
      const response = await api.post(
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
      const response = await api.post(
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
   * Generate PDF on the frontend using pdf-lib
   */
  async generatePDF(
    result: ReportResult,
    reportName: string = 'Custom Report',
    description?: string
  ): Promise<Blob> {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

    const pageWidth = 842; // A4 landscape width
    const pageHeight = 595; // A4 landscape height
    const margin = 50;
    const usableWidth = pageWidth - 2 * margin;
    const fontSize = 9;
    // const headerFontSize = 12;
    const titleFontSize = 16;
    const lineHeight = 14;
    const headerHeight = 80;

    // Calculate column widths
    const columnCount = result.columns.length;
    const columnWidth = usableWidth / columnCount;

    // Helper function to add a new page
    const addPage = () => {
      return pdfDoc.addPage([pageWidth, pageHeight]);
    };

    // Helper function to draw header
    const drawHeader = (page: any, pageNumber: number, totalPages: number) => {
      const y = pageHeight - margin;
      
      // Title
      page.drawText(reportName, {
        x: margin,
        y: y,
        size: titleFontSize,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
      });

      if (description) {
        page.drawText(description, {
          x: margin,
          y: y - 20,
          size: fontSize,
          font: timesRomanFont,
          color: rgb(0.4, 0.4, 0.4),
        });
      }

      // Metadata
      const metaY = y - (description ? 40 : 25);
      page.drawText(`Generated: ${new Date().toLocaleString()}`, {
        x: margin,
        y: metaY,
        size: fontSize - 1,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      page.drawText(`Total Rows: ${result.totalRows}`, {
        x: margin + 250,
        y: metaY,
        size: fontSize - 1,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      page.drawText(`Page ${pageNumber} of ${totalPages}`, {
        x: pageWidth - margin - 80,
        y: metaY,
        size: fontSize - 1,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Draw line under header
      page.drawLine({
        start: { x: margin, y: metaY - 10 },
        end: { x: pageWidth - margin, y: metaY - 10 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });

      return metaY - 25;
    };

    // Helper function to draw column headers
    const drawColumnHeaders = (page: any, y: number) => {
      // Draw background for header row
      page.drawRectangle({
        x: margin,
        y: y - 2,
        width: usableWidth,
        height: lineHeight + 4,
        color: rgb(0.95, 0.95, 0.95),
      });

      result.columns.forEach((column, index) => {
        const x = margin + index * columnWidth + 5;
        const text = column.length > 20 ? column.substring(0, 18) + '...' : column;
        
        page.drawText(text, {
          x,
          y: y + 3,
          size: fontSize,
          font: timesRomanBoldFont,
          color: rgb(0, 0, 0),
        });

        // Draw vertical separator
        if (index < result.columns.length - 1) {
          page.drawLine({
            start: { x: margin + (index + 1) * columnWidth, y: y - 2 },
            end: { x: margin + (index + 1) * columnWidth, y: y + lineHeight + 2 },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
          });
        }
      });

      return y - lineHeight - 5;
    };

    // Helper function to format cell value
    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'object') return JSON.stringify(value);
      const str = String(value);
      return str.length > 30 ? str.substring(0, 28) + '...' : str;
    };

    // Calculate total pages needed (will be updated if charts are added)
    let totalPages = 1;
    const rowsPerPage = Math.floor((pageHeight - headerHeight - margin - 40) / lineHeight) - 1;
    if (result.rows && result.rows.length > 0) {
      totalPages = Math.ceil(result.rows.length / rowsPerPage);
    }

    // Start generating pages
    let currentPageNumber = 1;
    let page = addPage();
    let currentY = drawHeader(page, currentPageNumber, totalPages);

    // Draw charts if they exist
    if (result.charts && result.charts.length > 0) {
      const chartsPerRow = PDFChartGenerator.getChartsPerRow(pageWidth, margin);
      const chartDimensions = PDFChartGenerator.getChartDimensions(pageWidth, margin, chartsPerRow);
      
      // Add spacing below header before first chart
      currentY -= 10;
      
      let chartX = margin;
      let chartRowY = currentY; // Track the Y position for the current row
      let chartIndex = 0;

      for (const chartData of result.charts) {
        // Check if we need a new row
        if (chartIndex > 0 && chartIndex % chartsPerRow === 0) {
          chartRowY -= chartDimensions.height + 25; // Move down for new row
          chartX = margin; // Reset X to left margin
          
          // Check if we need a new page
          if (chartRowY - chartDimensions.height < margin + 50) {
            currentPageNumber++;
            totalPages = Math.max(totalPages, currentPageNumber);
            page = addPage();
            chartRowY = drawHeader(page, currentPageNumber, totalPages) - 10;
            currentY = chartRowY;
            chartX = margin;
            chartIndex = 0;
          }
        }

        // Draw the chart
        const chartTitle = chartData.fieldId.replace('analytics.', '').replace(/_/g, ' ').toUpperCase();
        await PDFChartGenerator.drawDonutChart(
          page,
          pdfDoc,
          chartData,
          {
            x: chartX,
            y: chartRowY,
            width: chartDimensions.width,
            height: chartDimensions.height,
            title: chartTitle,
          },
          rgb,
          timesRomanFont,
          timesRomanBoldFont
        );

        chartX += chartDimensions.width + 20; // Move right for next chart
        chartIndex++;
      }

      // Set currentY to bottom of last chart row for table placement
      currentY = chartRowY - chartDimensions.height - 30;
      
      // Check if we need a new page for the table
      if (currentY < margin + (rowsPerPage * lineHeight)) {
        currentPageNumber++;
        totalPages = Math.max(totalPages, currentPageNumber);
        page = addPage();
        currentY = drawHeader(page, currentPageNumber, totalPages);
      }
    }

    // Generate table if there are rows
    if (result.rows && result.rows.length > 0) {
      currentY = drawColumnHeaders(page, currentY);
      let rowsOnCurrentPage = 0;

      result.rows.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (rowsOnCurrentPage >= rowsPerPage) {
          page = addPage();
          currentPageNumber++;
          totalPages = Math.max(totalPages, currentPageNumber);
          currentY = drawHeader(page, currentPageNumber, totalPages);
          currentY = drawColumnHeaders(page, currentY);
          rowsOnCurrentPage = 0;
        }

      // Draw row background (alternating colors)
      if (rowIndex % 2 === 1) {
        page.drawRectangle({
          x: margin,
          y: currentY - 2,
          width: usableWidth,
          height: lineHeight + 2,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      // Draw cells
      row.forEach((cell, colIndex) => {
        const x = margin + colIndex * columnWidth + 5;
        const text = formatValue(cell);

        page.drawText(text, {
          x,
          y: currentY + 2,
          size: fontSize,
          font: courierFont,
          color: rgb(0.2, 0.2, 0.2),
        });

        // Draw vertical separator
        if (colIndex < row.length - 1) {
          page.drawLine({
            start: { x: margin + (colIndex + 1) * columnWidth, y: currentY - 2 },
            end: { x: margin + (colIndex + 1) * columnWidth, y: currentY + lineHeight },
            thickness: 0.5,
            color: rgb(0.9, 0.9, 0.9),
          });
        }
      });

      currentY -= lineHeight;
      rowsOnCurrentPage++;
      });
    }

    // Save the PDF and return as Blob
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
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