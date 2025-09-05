import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from "date-fns"
import { useReportStore } from '@/stores/reportStore'
import type { Report } from '@/stores/reportStore'
import type { Arrhythmia } from '@/stores/reportStore'
import type { Patient } from '@/stores/patientStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, CalendarIcon, Loader2, Link as LinkIcon, FileText} from 'lucide-react'
import api from '@/utils/axios'
import { usePdfManager } from '@/hooks/usePdfManager'
import { PdfUploader } from '@/components/PdfUploader'
import { toast } from 'sonner'
import { usePdfFormFiller } from '@/hooks/usePdfFormFiller'
// import { useDoctorStore } from '@/stores/doctorStore'
import { FileImporter } from '@/components/FileImporter';
import type { ParsedData } from '@/utils/fileParser';



const initialFormData: Partial<Report> = {
  // Report info
  reportDate: new Date(),
  reportType: 'In Clinic',
  reportStatus: 'pending',
  isCompleted: false,
  comments: '',
  arrhythmias: [],
  qrs_duration: undefined,
  file_path: undefined,
  // Patient substrate
  currentHeartRate: undefined,
  currentRhythm: '',
  currentDependency: '',
  mdc_idc_stat_ataf_burden_percent: undefined,
  // Device Settings
  mdc_idc_set_brady_mode: '',
  mdc_idc_set_brady_lowrate: undefined,
  mdc_idc_set_brady_max_tracking_rate: undefined,
  mdc_idc_set_brady_max_sensor_rate: undefined,
  mdc_idc_dev_sav: undefined,
  mdc_idc_dev_pav: undefined,
  // Pacing Percentages
  mdc_idc_stat_brady_ra_percent_paced: undefined,
  mdc_idc_stat_brady_rv_percent_paced: undefined,
  mdc_idc_stat_brady_lv_percent_paced: undefined,
  mdc_idc_stat_tachy_biv_percent_paced: undefined,
  // Battery/device Diagnostics
  mdc_idc_batt_volt: undefined,
  mdc_idc_batt_remaining: undefined,
  mdc_idc_batt_percentage: undefined,
  mdc_idc_batt_status: undefined,
  mdc_idc_cap_charge_time: undefined,
  // Initialize all measurement fields to empty strings for controlled inputs
  mdc_idc_msmt_ra_impedance_mean: undefined,
  mdc_idc_msmt_ra_sensing: undefined,
  mdc_idc_msmt_ra_pacing_threshold: undefined,
  mdc_idc_msmt_ra_pw: undefined,
  mdc_idc_msmt_rv_impedance_mean: undefined,
  mdc_idc_msmt_rv_sensing: undefined,
  mdc_idc_msmt_rv_pacing_threshold: undefined,
  mdc_idc_msmt_rv_pw: undefined,
  mdc_idc_msmt_shock_impedance: undefined,
  mdc_idc_msmt_lv_impedance_mean: undefined,
  mdc_idc_msmt_lv_sensing: undefined,
  mdc_idc_msmt_lv_pacing_threshold: undefined,
  mdc_idc_msmt_lv_pw: undefined,
}

const initialArrhythmia: Arrhythmia = {
  name: '',
  symptoms: '',
  rate: '',
  termination: '',
  therapies: '',
}

interface ReportFormProps {
  patient: Patient
}

export function ReportForm({ patient }: ReportFormProps) {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const isEdit = !!reportId
  const pdfManager = usePdfManager() 
  const { currentReport, fetchReport, setCurrentReport } = useReportStore()
  const [formData, setFormData] = useState<Partial<Report>>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { fillReportForm, getFormFields, isGenerating } = usePdfFormFiller()
  console.log('Rendering ReportForm with patient:', patient)

  const handleDataImported = (data: ParsedData) => {
    // Map the parsed data to your form fields
    const updatedFormData = { ...formData };

    // Map common fields
    if (data.report_date) {
      const datePart = data.report_date.split('T')[0]; 
      // Create a new date in the local timezone using the UTC year, month, and day
      // This corrects for the timezone offset that can push the date to the previous day
      updatedFormData.reportDate = new Date(datePart);
    }
    if (data.report_type) {
      updatedFormData.reportType = data.report_type;
    }
    if (data.report_status) {
      updatedFormData.reportStatus = data.report_status;
    }
    if (data.current_heart_rate) {
      updatedFormData.currentHeartRate = parseFloat(data.current_heart_rate);
    }
    if (data.current_rhythm) {
      updatedFormData.currentRhythm = data.current_rhythm;
    }
    if (data.current_dependency) {
      updatedFormData.currentDependency = data.current_dependency;
    }
    if (data.qrs_duration) {
      updatedFormData.qrs_duration = parseFloat(data.qrs_duration);
    }
    if (data.comments) {
      updatedFormData.comments = data.comments;
    }
    if (data.is_completed !== undefined) {
      updatedFormData.isCompleted = data.is_completed;
    }
    if (data.mdc_idc_stat_ataf_burden_percent) {
      updatedFormData.mdc_idc_stat_ataf_burden_percent = parseFloat(data.mdc_idc_stat_ataf_burden_percent);
    }

    // Map device fields
    // if (data.mdc_idc_dev_serial_number) {
    //   updatedFormData.mdc_idc_dev_serial_number = data.mdc_idc_dev_serial_number;
    // }
    // if (data.mdc_idc_dev_model) {
    //   updatedFormData.mdc_idc_dev_model = data.mdc_idc_dev_model;
    // }
    // if (data.mdc_idc_dev_manufacturer) {
    //   updatedFormData.mdc_idc_dev_manufacturer = data.mdc_idc_dev_manufacturer;
    // }

    // Map bradycardia settings
    if (data.mdc_idc_set_brady_mode) {
      updatedFormData.mdc_idc_set_brady_mode = data.mdc_idc_set_brady_mode;
    }
    if (data.mdc_idc_set_brady_lowrate) {
      updatedFormData.mdc_idc_set_brady_lowrate = parseFloat(data.mdc_idc_set_brady_lowrate);
    }
    if (data.mdc_idc_set_brady_max_tracking_rate) {
      updatedFormData.mdc_idc_set_brady_max_tracking_rate = parseFloat(data.mdc_idc_set_brady_max_tracking_rate);
    }
    if (data.mdc_idc_set_brady_max_sensor_rate) {
      updatedFormData.mdc_idc_set_brady_max_sensor_rate = parseFloat(data.mdc_idc_set_brady_max_sensor_rate);
    }

    // Map pacing percentages
    if (data.mdc_idc_stat_brady_ra_percent) {
      updatedFormData.mdc_idc_stat_brady_ra_percent_paced = parseFloat(data.mdc_idc_stat_brady_ra_percent);
    }
    if (data.mdc_idc_stat_brady_rv_percent) {
      updatedFormData.mdc_idc_stat_brady_rv_percent_paced = parseFloat(data.mdc_idc_stat_brady_rv_percent);
    }
    if (data.mdc_idc_stat_brady_lv_percent) {
      updatedFormData.mdc_idc_stat_brady_lv_percent_paced = parseFloat(data.mdc_idc_stat_brady_lv_percent);
    }

    // Map battery data
    if (data.mdc_idc_batt_volt) {
      updatedFormData.mdc_idc_batt_volt = parseFloat(data.mdc_idc_batt_volt);
    }
    if (data.mdc_idc_batt_remaining) {
      updatedFormData.mdc_idc_batt_remaining = parseFloat(data.mdc_idc_batt_remaining);
    }
    if (data.mdc_idc_batt_status) {
      updatedFormData.mdc_idc_batt_status = data.mdc_idc_batt_status;
    }
    if (data.mdc_idc_cap_charge_time) {
      updatedFormData.mdc_idc_cap_charge_time = parseFloat(data.mdc_idc_cap_charge_time);
    }
    if (data.mdc_idc_batt_percentage) {
      updatedFormData.mdc_idc_batt_percentage = parseFloat(data.mdc_idc_batt_percentage);
    }
    // Map device settings
    if (data.mdc_idc_dev_sav) {
      updatedFormData.mdc_idc_dev_sav = data.mdc_idc_dev_sav;
    }
    if (data.mdc_idc_dev_pav) {
      updatedFormData.mdc_idc_dev_pav = data.mdc_idc_dev_pav;
    }

    // Map lead measurements
    if (data.mdc_idc_msmt_ra_impedance_mean) {
      updatedFormData.mdc_idc_msmt_ra_impedance_mean = parseFloat(data.mdc_idc_msmt_ra_impedance_mean);
    }
    if (data.mdc_idc_msmt_ra_sensing_mean) {
      updatedFormData.mdc_idc_msmt_ra_sensing = parseFloat(data.mdc_idc_msmt_ra_sensing_mean);
    }
    if (data.mdc_idc_msmt_ra_pacing_threshold) {
      updatedFormData.mdc_idc_msmt_ra_pacing_threshold = parseFloat(data.mdc_idc_msmt_ra_pacing_threshold);
    }
    if (data.mdc_idc_msmt_ra_pw) {
      updatedFormData.mdc_idc_msmt_ra_pw = parseFloat(data.mdc_idc_msmt_ra_pw);
    }

    // Map RV measurements
    if (data.mdc_idc_msmt_rv_impedance_mean) {
      updatedFormData.mdc_idc_msmt_rv_impedance_mean = parseFloat(data.mdc_idc_msmt_rv_impedance_mean);
    }
    if (data.mdc_idc_msmt_rv_sensing_mean) {
      updatedFormData.mdc_idc_msmt_rv_sensing = parseFloat(data.mdc_idc_msmt_rv_sensing_mean);
    }
    if (data.mdc_idc_msmt_rv_pacing_threshold) {
      updatedFormData.mdc_idc_msmt_rv_pacing_threshold = parseFloat(data.mdc_idc_msmt_rv_pacing_threshold);
    }
    if (data.mdc_idc_msmt_rv_pw) {
      updatedFormData.mdc_idc_msmt_rv_pw = parseFloat(data.mdc_idc_msmt_rv_pw);
    }

    // Map LV measurements
    if (data.mdc_idc_msmt_lv_impedance_mean) {
      updatedFormData.mdc_idc_msmt_lv_impedance_mean = parseFloat(data.mdc_idc_msmt_lv_impedance_mean);
    }
    if (data.mdc_idc_msmt_lv_sensing_mean) {
      updatedFormData.mdc_idc_msmt_lv_sensing = parseFloat(data.mdc_idc_msmt_lv_sensing_mean);
    }
    if (data.mdc_idc_msmt_lv_pacing_threshold) {
      updatedFormData.mdc_idc_msmt_lv_pacing_threshold = parseFloat(data.mdc_idc_msmt_lv_pacing_threshold);
    }
    if (data.mdc_idc_msmt_lv_pw) {
      updatedFormData.mdc_idc_msmt_lv_pw = parseFloat(data.mdc_idc_msmt_lv_pw);
    }

    // Map shock impedance
    if (data.mdc_idc_msmt_hv_impedance_mean) {
      updatedFormData.mdc_idc_msmt_shock_impedance = parseFloat(data.mdc_idc_msmt_hv_impedance_mean);
    }

    // If an embedded PDF was discovered in XML, convert and add to pdfManager
    if (data.embeddedPdfBase64) {
      try {
        const b64 = data.embeddedPdfBase64;
        const byteLen = atob(b64);
        const bytes = new Uint8Array(byteLen.length);
        for (let i = 0; i < byteLen.length; i++) bytes[i] = byteLen.charCodeAt(i);
        const fileName = data.embeddedPdfName || `embedded_report_${patient.id}.pdf`;
        const file = new File([bytes], fileName, { type: 'application/pdf' });

        // Use DataTransfer to produce a FileList for pdfManager.addFiles
        const dt = new DataTransfer();
        dt.items.add(file);
        // pdfManager.addFiles expects an input FileList (like from <input type="file">)
        if (typeof (pdfManager as any).addFiles === 'function') {
          (pdfManager as any).addFiles(dt.files);
        }
        toast.success('Embedded PDF found and queued for upload', { description: fileName });
      } catch (e) {
        console.error('Failed to attach embedded PDF from XML:', e);
      }
    }

    // Update the form data
    setFormData(updatedFormData);
    
    if (data.xml_report_pdf_file) { 
      try { const dt = new DataTransfer(); 
        dt.items.add(data.xml_report_pdf_file); 
        pdfManager.addFiles(dt.files); 
        toast.success(`Attached report PDF from XML: ${data.xml_report_pdf_name || data.xml_report_pdf_file.name}`); 
      } catch (err) { 
        console.error('Failed to add embedded PDF to uploader:', err); 
        toast.error('Parsed PDF found in XML, but failed to attach it.'); 
      } 
    }

    toast.success('Form fields have been populated with imported data');
  };

  useEffect(() => {
    if (isEdit && reportId) {
      fetchReport(parseInt(reportId))
    }
  }, [isEdit, reportId, fetchReport])

  useEffect(() => {
    if (isEdit && currentReport) {
      // Ensure date fields are converted to Date objects
      const reportWithDateObjects = {
        ...currentReport,
        reportDate: currentReport.reportDate ? new Date(currentReport.reportDate) : new Date(),
      };
      setFormData(reportWithDateObjects)
    }
  }, [isEdit, currentReport])

  const handleGeneratePdf = async () => {
    try {
      const pdfBlob = await fillReportForm(formData, patient)
      if (pdfBlob) {
        const url = window.URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `medical_report_${patient.fname}_${patient.lname}_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        toast.success('PDF report generated successfully!')
      } else {
        toast.error('Failed to generate PDF report')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF report')
    }
  }

  // Debug function to see available form fields
  const handleDebugFields = async () => {
    const fields = await getFormFields()
    console.log('Available PDF form fields:', fields)
    console.log('Available fields', patient, formData)
    toast.info(`Found ${fields.length} form fields. Check console for details.`)
  }

    const handleMeasurementChange = (fieldName: keyof Report, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setFormData(prev => ({ ...prev, [fieldName]: numValue }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const isNumberField = type === 'number';
    setFormData(prev => ({ ...prev, [name]: isNumberField && value !== '' ? parseFloat(value) : value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, reportDate: date }))
    }
  }

  const handleArrhythmiaChange = (index: number, field: keyof Arrhythmia, value: string) => {
    const updatedArrhythmias = [...(formData.arrhythmias || [])]
    updatedArrhythmias[index] = { ...updatedArrhythmias[index], [field]: value }
    setFormData(prev => ({ ...prev, arrhythmias: updatedArrhythmias }))
  }

  const addArrhythmia = () => {
    const arrhythmias = [...(formData.arrhythmias || []), initialArrhythmia]
    setFormData(prev => ({ ...prev, arrhythmias }))
  }

  const removeArrhythmia = (index: number) => {
    const arrhythmias = (formData.arrhythmias || []).filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, arrhythmias }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
  
    let mergedPdfBlob: Blob | null = null;
  
    // Only perform merge logic if new files have been added
    if (pdfManager.files.length > 0) {
      // If we are editing and a PDF already exists, fetch it first
      if (isEdit && currentReport?.file_url) {
        try {
          // FIX: Use the correct API path for fetching the existing PDF
          const apiPath = currentReport.file_url?.replace('/uploads/', '/files/');
          const response = await api.get(apiPath, { responseType: 'blob' });
          const existingPdfFile = new File([response.data], "existing-report.pdf", { type: 'application/pdf' });
          
          // Create a new array with existing file first, then new files
          const allFiles = [existingPdfFile, ...pdfManager.files];
          
          // Merge all files using the PDF manager's merge function directly
          mergedPdfBlob = await pdfManager.mergePdfsFromArray(allFiles);
  
        } catch (error) {
          console.error("Failed to fetch existing PDF for merging:", error);
          setIsSubmitting(false);
          return;
        }
      } else {
        // No existing PDF, just merge the new files
        mergedPdfBlob = await pdfManager.mergePdfs();
      }
    }
  
    const submissionData = new FormData()
    submissionData.append('patientId', patient.id.toString())
    
    // If merging PDFs was successful, append the merged PDF blob
    if (mergedPdfBlob) {
      // Use a descriptive filename
      const fileName = `report_${patient.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      submissionData.append('file', mergedPdfBlob, fileName)
    }
  
    // Append all form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'arrhythmias') {
        submissionData.append(key, JSON.stringify(value))
      } else if (value instanceof Date) {
        submissionData.append(key, value.toISOString())
      } else if (value !== null && value !== undefined) {
        submissionData.append(key, String(value))
      }
    })
  
    try {
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
      if (isEdit && reportId) {
        const response = await api.put(`/reports/${reportId}`, submissionData, config)
        setCurrentReport(response.data) 
        // toast.success("Report updated successfully!")
      } else {
        await api.post('/reports', submissionData, config)
      }
      toast.success(`Report ${isEdit ? 'updated' : 'created'} successfully!`, {
        action: {
          label: 'View Report List',
          onClick: () => navigate(`/patients/${patient.id}/reports`)
        }
      })
      // Clear the PDF files after successful submission
      // This prevents the same files from being uploaded again
      pdfManager.files.forEach(() => pdfManager.removeFile(0))
      // navigate(`/patients/${patient.id}/reports`)
    } catch (error) {
      console.error("Failed to submit report", error)
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} report`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Patients', href: '/patients' },
    { label: `${patient.fname} ${patient.lname}`, href: `/patients/${patient.id}` },
    { label: 'Reports', href: `/patients/${patient.id}/reports` },
    { label: isEdit ? 'Edit Report' : 'New Report', current: true }
  ]

  return (
    <div className="container mx-auto py-6">
    <BreadcrumbNav items={breadcrumbItems} />

    <div>
  {/* active implanted device device manufacturer, name, serial and active implanted leads  manufacturer, name, serial */}
  {(() => {
    const p = (typeof patient !== 'undefined' && patient) ? patient : (typeof currentPatient !== 'undefined' ? currentPatient : null)
    const activeDevices = (p?.devices ?? []).filter((d: any) => String(d?.status || '').toLowerCase() === 'active' && !d?.explantedAt)
    const activeLeads = (p?.leads ?? []).filter((l: any) => String(l?.status || '').toLowerCase() === 'active' && !l?.explantedAt)

    if (!p) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border rounded-2xl bg-white shadow">
        <div>
          <h4 className="text-sm font-medium mb-2">Active Implanted Device(s)</h4>
          {activeDevices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active devices.</p>
          ) : (
            <ul className="space-y-1">
              {activeDevices.map((d: any) => (
                <li key={d.id} className="text-sm">
                  <span className="font-medium">{d?.device?.manufacturer}</span>
                  {' • '}
                  {d?.device?.name}
                  {' • '}
                  SN: {d?.serial}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Active Implanted Lead(s)</h4>
          {activeLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active leads.</p>
          ) : (
            <ul className="space-y-1">
              {activeLeads.map((l: any) => (
                <li key={l.id} className="text-sm">
                  <span className="font-medium">{l?.lead?.manufacturer}</span>
                  {' • '}
                  {l?.lead?.name}
                  {' • '}
                  SN: {l?.serial}
                  {l?.chamber ? <> {' • '} {l.chamber}</> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  })()}
</div>

    <form onSubmit={handleSubmit} className="space-y-6">
    <FileImporter onDataImported={handleDataImported} />
    
     <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>High-level details about this report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Report Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.reportDate ? format(new Date(formData.reportDate), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={formData.reportDate ? new Date(formData.reportDate) : undefined} onSelect={handleDateChange} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select name="reportType" value={formData.reportType || ''} onValueChange={(value) => handleSelectChange('reportType', value)}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Clinic">In Clinic</SelectItem>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="Triage">Triage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Report Status</Label>
              <Select name="reportStatus" value={formData.reportStatus || ''} onValueChange={(value) => handleSelectChange('reportStatus', value)}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentHeartRate">Heart Rate (bpm)</Label>
              <Input id="currentHeartRate" name="currentHeartRate" type="number" value={formData.currentHeartRate || ''} onChange={handleChange} placeholder="e.g., 60" />
            </div>
            <div className="space-y-2">
              <Label>Current Rhythm</Label>
              <Select name="currentRhythm" value={formData.currentRhythm || ''} onValueChange={(value) => handleSelectChange('currentRhythm', value)}>
                <SelectTrigger><SelectValue placeholder="Select rhythm..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NSR">NSR</SelectItem>
                  <SelectItem value="AFib">AFib</SelectItem>
                  <SelectItem value="AFL">AFL</SelectItem>
                  <SelectItem value="Paced">Paced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pacing Dependency</Label>
              <Select name="currentDependency" value={formData.currentDependency || ''} onValueChange={(value) => handleSelectChange('currentDependency', value)}>
                <SelectTrigger><SelectValue placeholder="Select dependency..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dependent">Dependent</SelectItem>
                  <SelectItem value="Non-Dependent">Non-Dependent</SelectItem>
                  <SelectItem value="Intermittent">Intermittent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>QRS Duration</Label>
              <Input id="qrs_duration" name="qrs_duration" type="number" value={formData.qrs_duration || ''} onChange={handleChange} placeholder="e.g., 80-120" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea id="comments" name="comments" value={formData.comments || ''} onChange={(e) => setFormData(prev => ({...prev, comments: e.target.value}))} placeholder="Add any relevant comments here..." />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="isCompleted" name="isCompleted" checked={!!formData.isCompleted} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isCompleted: !!checked }))} />
            <Label htmlFor="isCompleted" className="font-normal">Mark as Completed</Label>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Bradycardia Settings</CardTitle>
          <CardDescription>Programmed parameters for bradycardia pacing.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Pacing Mode</Label>
            <Select name="mdc_idc_set_brady_mode" value={formData.mdc_idc_set_brady_mode || ''} onValueChange={(value) => handleSelectChange('mdc_idc_set_brady_mode', value)}>
              <SelectTrigger><SelectValue placeholder="Select mode..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AAI">AAI</SelectItem>
                <SelectItem value="VVI">VVI</SelectItem>
                <SelectItem value="AAIR">AAIR</SelectItem>
                <SelectItem value="VVIR">VVIR</SelectItem>
                <SelectItem value="VVI-CLS">VVI-CLS</SelectItem>
                <SelectItem value="DDD-CLS">DDD-CLS</SelectItem>
                <SelectItem value="DDD">DDD</SelectItem>
                <SelectItem value="DDDR">DDDR</SelectItem>
                <SelectItem value="DDI">DDI</SelectItem>
                <SelectItem value="DDIR">DDIR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mdc_idc_set_brady_lowrate">Lower Rate (bpm)</Label>
            <Input id="mdc_idc_set_brady_lowrate" name="mdc_idc_set_brady_lowrate" type="number" value={formData.mdc_idc_set_brady_lowrate || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mdc_idc_set_brady_max_tracking_rate">Max Tracking Rate (bpm)</Label>
            <Input id="mdc_idc_set_brady_max_tracking_rate" name="mdc_idc_set_brady_max_tracking_rate" type="number" value={formData.mdc_idc_set_brady_max_tracking_rate || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mdc_idc_set_brady_max_sensor_rate">Max Sensor Rate (bpm)</Label>
            <Input id="mdc_idc_set_brady_max_sensor_rate" name="mdc_idc_set_brady_max_sensor_rate" type="number" value={formData.mdc_idc_set_brady_max_sensor_rate || ''} onChange={handleChange} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pacing Percentages</CardTitle>
            <CardDescription>Enter the percentage of time each chamber was paced.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mdc_idc_stat_brady_ra_percent_paced">RA Paced (%)</Label>
              <Input id="mdc_idc_stat_brady_ra_percent_paced" name="mdc_idc_stat_brady_ra_percent_paced" type="number" step="any" value={formData.mdc_idc_stat_brady_ra_percent_paced || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mdc_idc_stat_brady_rv_percent_paced">RV Paced (%)</Label>
              <Input id="mdc_idc_stat_brady_rv_percent_paced" name="mdc_idc_stat_brady_rv_percent_paced" type="number" step="any" value={formData.mdc_idc_stat_brady_rv_percent_paced || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mdc_idc_stat_brady_lv_percent_paced">LV Paced (%)</Label>
              <Input id="mdc_idc_stat_brady_lv_percent_paced" name="mdc_idc_stat_brady_lv_percent_paced" type="number" step="any" value={formData.mdc_idc_stat_brady_lv_percent_paced || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mdc_idc_stat_tachy_biv_percent_paced">BiV Paced (%)</Label>
              <Input id="mdc_idc_stat_tachy_biv_percent_paced" name="mdc_idc_stat_tachy_biv_percent_paced" type="number" step="any" value={formData.mdc_idc_stat_tachy_biv_percent_paced || ''} onChange={handleChange} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Battery & Device Diagnostics</CardTitle>
            <CardDescription>Details about the device's battery and health.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mdc_idc_batt_volt">Battery Voltage (V)</Label>
              <Input id="mdc_idc_batt_volt" name="mdc_idc_batt_volt" type="number" step="any" value={formData.mdc_idc_batt_volt || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">  
              <Label htmlFor="mdc_idc_batt_remaining">Longevity (yrs)</Label>
              <Input id="mdc_idc_batt_remaining" name="mdc_idc_batt_remaining" type="number" step="any" value={formData.mdc_idc_batt_remaining || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor='mdc_idc_batt_percentage' >Longevity (%)</Label>
              <Input id="mdc_idc_batt_percentage" name="mdc_idc_batt_percentage" type="number" step="any" value={formData.mdc_idc_batt_percentage || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Battery Status</Label>
              <Select name="mdc_idc_batt_status" value={formData.mdc_idc_batt_status || ''} onValueChange={(value) => handleSelectChange('mdc_idc_batt_status', value)}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOL">BOL (Beginning Of Life)</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="MOS">MOS (Middle Of Service)</SelectItem>
                  <SelectItem value="ERI">ERI (Elective Replacement)</SelectItem>
                  <SelectItem value="EOL">EOL (End of Life)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mdc_idc_cap_charge_time">Charge Time (s)</Label>
              <Input id="mdc_idc_cap_charge_time" name="mdc_idc_cap_charge_time" type="number" step="any" value={formData.mdc_idc_cap_charge_time || ''} onChange={handleChange} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Measurements</CardTitle>
          <CardDescription>Enter the measured values for each lead chamber.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Chamber</TableHead>
                <TableHead>Impedance (Ω)</TableHead>
                <TableHead>Sensing (mV)</TableHead>
                <TableHead>Threshold (V)</TableHead>
                <TableHead>Pulse Width (ms)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">RA</TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_ra_impedance_mean || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_ra_impedance_mean', e.target.value)} /></TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_ra_sensing || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_ra_sensing', e.target.value)} /></TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_ra_pacing_threshold || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_ra_pacing_threshold', e.target.value)} /></TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_ra_pw || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_ra_pw', e.target.value)} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">RV</TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_rv_impedance_mean || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_rv_impedance_mean', e.target.value)} /></TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_rv_sensing || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_rv_sensing', e.target.value)} /></TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_rv_pacing_threshold || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_rv_pacing_threshold', e.target.value)} /></TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_rv_pw || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_rv_pw', e.target.value)} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">LV</TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_lv_impedance_mean || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_lv_impedance_mean', e.target.value)} /></TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_lv_sensing || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_lv_sensing', e.target.value)} /></TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_lv_pacing_threshold || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_lv_pacing_threshold', e.target.value)} /></TableCell>
                <TableCell><Input type="number" step="any" value={formData.mdc_idc_msmt_lv_pw || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_lv_pw', e.target.value)} /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="mt-4 border-t pt-4">
             <Label className='pb-2'>RV Shock Impedance (Ω)</Label>
             <Input type="number" step="any" value={formData.mdc_idc_msmt_shock_impedance || ''} onChange={e => handleMeasurementChange('mdc_idc_msmt_shock_impedance', e.target.value)} className="max-w-xs" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Arrhythmia Events</CardTitle>
          <CardDescription>Add one or more arrhythmia events observed in this report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(formData.arrhythmias || []).map((arr, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
              <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 pb-2" onClick={() => removeArrhythmia(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className='pb-2'>Name</Label>
                  <Select value={arr.name} onValueChange={value => handleArrhythmiaChange(index, 'name', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select arrhythmia type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="af">Atrial Fibrillation</SelectItem>
                      <SelectItem value="afl">Atrial Flutter</SelectItem>
                      <SelectItem value="svt">Superventricular Tachycardia</SelectItem>
                      <SelectItem value="nsvt">Non Sustained Ventricular Tachycardia</SelectItem>
                      <SelectItem value="vt">Ventricular Tachycardia</SelectItem>
                      <SelectItem value="vf">Ventricular Fibrillation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* <div><Label className='pb-2'>Symptoms</Label><Input value={arr.symptoms} onChange={e => handleArrhythmiaChange(index, 'symptoms', e.target.value)} placeholder="e.g., Palpitations" /></div> */}
                
                <div>
                  <Label className='pb-2'>Symptoms</Label>
                    <Select value={arr.symptoms} onValueChange={value => handleArrhythmiaChange(index, 'symptoms', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select symptom type" />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                        <SelectItem value="palpatations">Palpatations</SelectItem>
                        <SelectItem value="pre-syncope">Pre-syncope</SelectItem>
                        <SelectItem value="syncope">Syncope</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                <div><Label className='pb-2'>Rate (bpm)</Label><Input type="number" value={arr.rate} onChange={e => handleArrhythmiaChange(index, 'rate', e.target.value)} placeholder="e.g., 150" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* <div><Label className='pb-2'>Termination</Label><Input value={arr.termination} onChange={e => handleArrhythmiaChange(index, 'termination', e.target.value)} placeholder="e.g., Spontaneous" /></div> */}
                <div>
                  <Label className='pb-2'>Termination</Label>
                    <Select value={arr.termination} onValueChange={value => handleArrhythmiaChange(index, 'termination', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select temination method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ongoing">On Going</SelectItem>
                        <SelectItem value="spontanous">Spontanous</SelectItem>
                        <SelectItem value="atp">Ant Tachy pacing</SelectItem>
                        <SelectItem value="shock">Cardioversion</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                
                <div><Label className='pb-2'>Therapies</Label><Input value={arr.therapies} onChange={e => handleArrhythmiaChange(index, 'therapies', e.target.value)} placeholder="e.g., ATP" /></div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addArrhythmia}>
            <Plus className="mr-2 h-4 w-4" /> Add Arrhythmia Event
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PDF Attachments</CardTitle>
          <CardDescription>
            {isEdit && currentReport?.file_url 
              ? "View the current PDF or attach new files to merge and replace it." 
              : "Attach and merge multiple PDF files into a single document."}
          </CardDescription>
        </CardHeader>
        <CardContent>

        <CardContent>
          {isEdit && currentReport?.file_url && (
            <div className="mb-4">
              <Button 
              type='button'
                variant="outline"
                onClick={async () => {
                  try {
                    const apiPath = currentReport.file_url?.replace('/uploads/', '/files/');
                    if (!apiPath) {
                      console.error('apiPath is undefined')
                      return
                    }
                    const response = await api.get(apiPath, { 
                      responseType: 'blob' 
                    });
                    
                    // Create a blob URL and open it in a new tab
                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    
                    // Clean up the blob URL after a short delay
                    setTimeout(() => window.URL.revokeObjectURL(url), 100);
                  } catch (error) {
                    console.error('Failed to load PDF:', error);
                    // Handle error (show notification, etc.)
                  }
                }}
              >
                <LinkIcon className="mr-2 h-4 w-4" /> View Current PDF
              </Button>
            </div>
          )}
     
        </CardContent>
          <PdfUploader pdfManager={pdfManager} />
        </CardContent>
      </Card>

      <div className="flex justify-end items-center  pt-4">
        <div className="flex gap-2">
          <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating Report...' : 'Generate PDF Report'}
            </Button>

            {/* Debug button - remove in production */}
            <Button
              type="button"
              variant="ghost"
              onClick={handleDebugFields}
              className="text-sm"
            >
              Debug Fields
            </Button>
        </div>
        <Button type="submit" disabled={isSubmitting || pdfManager.isMerging} size="lg">
          {(isSubmitting || pdfManager.isMerging) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {pdfManager.isMerging ? 'Merging PDFs...' : (isSubmitting ? 'Submitting...' : (isEdit ? 'Update Report' : 'Create Report'))}
        </Button>
      </div>
    </form>
  </div>
  )
}