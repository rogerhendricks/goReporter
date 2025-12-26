import type { ChartData } from '@/components/report-builder/types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface ChartDrawOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
}

export class PDFChartGenerator {
  /**
   * Render a chart to a canvas and return as data URL
   */
  private static async renderChartToImage(
    chartData: ChartData,
    width: number,
    height: number
  ): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2; // 2x for better quality
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve('');
        return;
      }

      const colors = [
        '#4299e1', '#f6ad55', '#48bb78', '#f56565', '#9f7aea',
        '#38b2ac', '#ecc94b', '#ed8936', '#d53f8d', '#a0aec0'
      ];

      const chart = new ChartJS(ctx, {
        type: 'doughnut',
        data: {
          labels: chartData.data.map(d => d.label),
          datasets: [{
            data: chartData.data.map(d => d.count),
            backgroundColor: chartData.data.map((_, i) => colors[i % colors.length]),
            borderWidth: 2,
            borderColor: '#ffffff',
          }]
        },
        options: {
          responsive: false,
          animation: false,
          cutout: '55%',
          plugins: {
            legend: {
              position: 'right',
              align: 'center',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 8,
                padding: 10,
                font: {
                  size: 11
                }
              }
            },
            tooltip: {
              enabled: false
            }
          }
        }
      });

      // Wait for chart to render, then convert to image
      setTimeout(() => {
        const dataUrl = canvas.toDataURL('image/png');
        chart.destroy();
        resolve(dataUrl);
      }, 100);
    });
  }

  /**
   * Draw a donut chart on a PDF page using embedded image
   */
  /**
   * Draw a donut chart on a PDF page using embedded image
   */
  static async drawDonutChart(
    page: any,
    pdfDoc: any,
    chartData: ChartData,
    options: ChartDrawOptions,
    rgb: any,
    font: any,
    boldFont: any
  ): Promise<number> {
    const { x, y, width, height, title } = options;

    // Draw title
    page.drawText(title, {
      x: x,
      y: y + 10,
      size: 11,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Check for empty data
    const total = chartData.data.reduce((sum, item) => sum + (item.count || 0), 0);
    if (total === 0) {
      page.drawText('No data available', {
        x: x + width / 2 - 40,
        y: y - height / 2,
        size: 9,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
      return y - height - 20;
    }

    // Render chart to image
    const imageDataUrl = await this.renderChartToImage(chartData, width, height - 30);
    
    if (imageDataUrl) {
      try {
        // Embed the PNG image
        const imageBytes = await fetch(imageDataUrl).then(res => res.arrayBuffer());
        const image = await pdfDoc.embedPng(imageBytes);
        
        // Draw the image
        // const imageDims = image.scale(1);
        const drawWidth = width;
        const drawHeight = height - 30;
        
        page.drawImage(image, {
          x: x,
          y: y - height + 10,
          width: drawWidth,
          height: drawHeight,
        });
      } catch (error) {
        console.error('Failed to embed chart image:', error);
        page.drawText('Chart rendering failed', {
          x: x + width / 2 - 50,
          y: y - height / 2,
          size: 9,
          font: font,
          color: rgb(0.7, 0, 0),
        });
      }
    }

    return y - height - 20;
  }

  /**
   * Calculate how many charts fit on a page row
   */
  static getChartsPerRow(pageWidth: number, margin: number): number {
    const usableWidth = pageWidth - 2 * margin;
    return Math.floor(usableWidth / 200); // Each chart needs ~200pts width (smaller)
  }

  /**
   * Calculate chart dimensions based on page layout
   */
  static getChartDimensions(pageWidth: number, margin: number, chartsPerRow: number): { width: number; height: number } {
    const usableWidth = pageWidth - 2 * margin;
    const width = Math.min((usableWidth / chartsPerRow) - 20, 180); // Cap at 180pts
    const height = 130; // Reduced from 200 to 130 (about half)
    return { width, height };
  }
}
