import { useState } from 'react'
import { usePdfFormFiller } from './usePdfFormFiller'
import { toast } from 'sonner'
import api from '@/utils/axios'
import type { Patient } from '@/stores/patientStore'

export function useReportPdfHandler() {
  const [isProcessing, setIsProcessing] = useState(false)
  const { fillReportForm } = usePdfFormFiller()

  const viewReportPdf = async (reportId: number, patient: Patient) => {
    if (!patient) {
      toast.error('Patient data not loaded')
      return
    }

    setIsProcessing(true)
    try {
      toast.info('Generating PDF...')
      
      // Fetch the full report data
      const response = await api.get(`/reports/${reportId}`)
      const reportData = response.data
      
      // Check if there's a stored PDF first
    //   if (reportData.file_url) {
    //     const fileUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/files${reportData.file_url.replace('/uploads', '')}`
    //     window.open(fileUrl, '_blank')
    //     toast.success('PDF opened successfully!')
    //     return
    //   }
      
      // Generate PDF from template if no stored PDF
      const pdfBlob = await fillReportForm(reportData, patient)
      
      if (pdfBlob) {
        // Create download link
        const url = window.URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `medical_report_${patient.fname}_${patient.lname}_${new Date(reportData.reportDate).toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        toast.success('PDF generated successfully!')
      } else {
        toast.error('Failed to generate PDF')
      }
    } catch (error) {
      console.error('Error processing PDF:', error)
      toast.error('Failed to process PDF')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadReportPdf = async (reportId: number, patient: Patient) => {
    if (!patient) {
      toast.error('Patient data not loaded')
      return
    }

    setIsProcessing(true)
    try {
      toast.info('Downloading PDF...')
      
      // Fetch the full report data
      const response = await api.get(`/reports/${reportId}`)
      const reportData = response.data
      
      // Always generate fresh PDF for download
      const pdfBlob = await fillReportForm(reportData, patient)
      
      if (pdfBlob) {
        const url = window.URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `report_${patient.fname}_${patient.lname}_${new Date(reportData.reportDate).toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        toast.success('PDF downloaded successfully!')
      } else {
        toast.error('Failed to generate PDF')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF')
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    viewReportPdf,
    downloadReportPdf,
    isProcessing
  }
}