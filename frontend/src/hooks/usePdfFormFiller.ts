import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import type { Report } from '@/stores/reportStore'
import type { Patient } from '@/stores/patientStore'

export function usePdfFormFiller() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fillReportForm = async (
    formData: Partial<Report>,
    patient: Patient,
  ): Promise<Blob | null> => {
    setIsGenerating(true)
    setError(null)

    try {
      // Load the PDF form template
      const templateResponse = await fetch('/templates/report-template.pdf')
      if (!templateResponse.ok) {
        throw new Error('Failed to load PDF template')
      }
      
      const templateBytes = await templateResponse.arrayBuffer()
      const pdfDoc = await PDFDocument.load(templateBytes)
      const form = pdfDoc.getForm()

      // Helper function to safely fill form fields
      const fillTextField = (fieldName: string, value: string | number | null | undefined) => {
        try {
          const field = form.getTextField(fieldName)
          field.setText(value ? String(value) : '')
        } catch (error) {
          console.warn(`Field '${fieldName}' not found in PDF form`)
        }
      }

      const fillCheckBox = (fieldName: string, checked: boolean) => {
        try {
          const field = form.getCheckBox(fieldName)
          if (checked) {
            field.check()
          } else {
            field.uncheck()
          }
        } catch (error) {
          console.warn(`Checkbox '${fieldName}' not found in PDF form`)
        }
      }

      const fillDropdown = (fieldName: string, value: string | null | undefined) => {
        try {
          const field = form.getDropdown(fieldName)
          if (value) {
            field.select(value)
          }
        } catch (error) {
          console.warn(`Dropdown '${fieldName}' not found in PDF form`)
        }
      }

      // Fill Patient Information
      fillTextField('patient_name', `${patient.fname} ${patient.lname}`)
      fillTextField('patient_mrn', patient.mrn)
      fillTextField('patient_dob', patient.dob ? new Date(patient.dob).toLocaleDateString() : '')
      fillTextField('patient_phone', patient.phone)
      fillTextField('patient_address', patient.street)
      fillTextField('patient_city', patient.city)
      fillTextField('patient_state', patient.state)
      fillTextField('patient_country', patient.country)
      fillTextField('patient_postal', patient.postal)
      // Fill Doctor Information (assuming first doctor is primary)
      if ((patient as any).doctors && (patient as any).doctors.length > 0) {
        const primaryDoctor = (patient as any).doctors[0]
        fillTextField('doctor_name', `Dr. ${primaryDoctor.name}`)
        fillTextField('doctor_email', primaryDoctor.email)
        fillTextField('doctor_phone', primaryDoctor.phone)
        fillTextField('doctor_address', primaryDoctor.address)
      }

      // Fill Report Details
      fillTextField('report_date', formData.reportDate ? new Date(formData.reportDate).toLocaleDateString() : '')
      fillTextField('report_type', formData.reportType)
      fillTextField('report_status', formData.reportStatus)
      fillTextField('heart_rate', formData.currentHeartRate)
      fillTextField('current_rhythm', formData.currentRhythm)
      fillTextField('pacing_dependency', formData.currentDependency)
      fillTextField('comments', formData.comments)
      fillCheckBox('is_completed', formData.isCompleted || false)

      // Fill Bradycardia Settings
      fillTextField('brady_mode', formData.mdc_idc_set_brady_mode)
      fillTextField('brady_lower_rate', formData.mdc_idc_set_brady_lowrate)
      fillTextField('brady_max_tracking', formData.mdc_idc_set_brady_max_tracking_rate)
      fillTextField('brady_max_sensor', formData.mdc_idc_set_brady_max_sensor_rate)

      // Fill Pacing Percentages
      fillTextField('ra_paced_percent', formData.mdc_idc_stat_brady_ra_percent_paced)
      fillTextField('rv_paced_percent', formData.mdc_idc_stat_brady_rv_percent_paced)
      fillTextField('lv_paced_percent', formData.mdc_idc_stat_brady_lv_percent_paced)
      fillTextField('biv_paced_percent', formData.mdc_idc_stat_tachy_biv_percent_paced)

      // Fill Battery & Device Diagnostics
      fillTextField('battery_voltage', formData.mdc_idc_batt_volt)
      fillTextField('battery_longevity', formData.mdc_idc_batt_remaining)
      fillDropdown('battery_status', formData.mdc_idc_batt_status)
      fillTextField('charge_time', formData.mdc_idc_cap_charge_time)

      // Fill Lead Measurements
      fillTextField('ra_impedance', formData.mdc_idc_msmt_ra_impedance_mean)
      fillTextField('ra_sensing', formData.mdc_idc_msmt_ra_sensing)
      fillTextField('ra_threshold', formData.mdc_idc_msmt_ra_pacing_threshold)
      fillTextField('ra_pulse_width', formData.mdc_idc_msmt_ra_pw)

      fillTextField('rv_impedance', formData.mdc_idc_msmt_rv_impedance_mean)
      fillTextField('rv_sensing', formData.mdc_idc_msmt_rv_sensing)
      fillTextField('rv_threshold', formData.mdc_idc_msmt_rv_pacing_threshold)
      fillTextField('rv_pulse_width', formData.mdc_idc_msmt_rv_pw)

      fillTextField('lv_impedance', formData.mdc_idc_msmt_lv_impedance_mean)
      fillTextField('lv_sensing', formData.mdc_idc_msmt_lv_sensing)
      fillTextField('lv_threshold', formData.mdc_idc_msmt_lv_pacing_threshold)
      fillTextField('lv_pulse_width', formData.mdc_idc_msmt_lv_pw)

      fillTextField('shock_impedance', formData.mdc_idc_msmt_shock_impedance)

      // Fill Arrhythmia Events (for first few events)
      if (formData.arrhythmias && formData.arrhythmias.length > 0) {
        formData.arrhythmias.slice(0, 3).forEach((arrhythmia, index) => {
          const suffix = index === 0 ? '' : `_${index + 1}`
          fillTextField(`arrhythmia_name${suffix}`, arrhythmia.name)
          fillTextField(`arrhythmia_symptoms${suffix}`, arrhythmia.symptoms)
          fillTextField(`arrhythmia_rate${suffix}`, arrhythmia.rate)
          fillTextField(`arrhythmia_termination${suffix}`, arrhythmia.termination)
          fillTextField(`arrhythmia_therapies${suffix}`, arrhythmia.therapies)
        })
      }

      // Add generation timestamp
      fillTextField('generated_date', new Date().toLocaleDateString())
      fillTextField('generated_time', new Date().toLocaleTimeString())

      // Flatten the form to prevent further editing (optional)
      // form.flatten()

      // Generate the PDF
      const pdfBytes = await pdfDoc.save()
      return new Blob([pdfBytes], { type: 'application/pdf' })

    } catch (error) {
      console.error('Error filling PDF form:', error)
      setError('Failed to generate PDF report')
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  // Function to get available form fields (useful for debugging)
  const getFormFields = async (): Promise<string[]> => {
    try {
      const templateResponse = await fetch('/templates/report-template.pdf')
      const templateBytes = await templateResponse.arrayBuffer()
      const pdfDoc = await PDFDocument.load(templateBytes)
      const form = pdfDoc.getForm()
      
      return form.getFields().map(field => field.getName())
    } catch (error) {
      console.error('Error getting form fields:', error)
      return []
    }
  }

  return {
    fillReportForm,
    getFormFields,
    isGenerating,
    error
  }
}