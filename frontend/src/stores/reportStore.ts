import { create } from 'zustand'
import api from '../utils/axios'
import type { Tag } from '../services/tagService'

// Interface for Arrhythmia based on schema
export interface Arrhythmia {
  id?: number // Optional for new arrhythmias
  name: string
  symptoms: string
  rate: number | string // Use string in form, convert to number on submit
  termination: string
  therapies: string
}

// Interface for Report based on schema
export interface Report {
  id: number
  patientId: number
  // Patient substrate
  reportDate: Date | string
  reportType: string
  reportStatus: string
  // Patient substrate
  currentHeartRate?: number | null
  currentRhythm?: string | null
  currentDependency?: string | null
  // Patient arrhythmias
  mdc_idc_stat_ataf_burden_percent?: number | null
  qrs_duration?: number | null

  // Episode counts (since last check)
  episode_af_count_since_last_check?: number | null
  episode_tachy_count_since_last_check?: number | null
  episode_pause_count_since_last_check?: number | null
  episode_symptom_all_count_since_last_check?: number | null
  episode_symptom_with_detection_count_since_last_check?: number | null
  // Device settings
  mdc_idc_set_brady_mode?: string | null
  mdc_idc_set_brady_lowrate?: number | null
  mdc_idc_set_brady_max_tracking_rate?: number | null
  mdc_idc_set_brady_max_sensor_rate?: number | null
  mdc_idc_dev_sav?: string | null
  mdc_idc_dev_pav?: string | null
  // Pacing percentages
  mdc_idc_stat_brady_ra_percent_paced?: number | null
  mdc_idc_stat_brady_rv_percent_paced?: number | null
  mdc_idc_stat_brady_lv_percent_paced?: number | null
  mdc_idc_stat_brady_biv_percent_paced?: number | null
  // Battery/device diagnostics
  mdc_idc_batt_volt?: number | null
  mdc_idc_batt_remaining?: number | null
  mdc_idc_batt_percentage?: number | null
  mdc_idc_batt_status?: string | null
  mdc_idc_cap_charge_time?: number | null
  // Atrial measurements
  mdc_idc_msmt_ra_impedance_mean?: number | null
  mdc_idc_msmt_ra_sensing?: number | null
  mdc_idc_msmt_ra_pacing_threshold?: number | null
  mdc_idc_msmt_ra_pw?: number | null
  // RV measurements
  mdc_idc_msmt_rv_impedance_mean?: number | null
  mdc_idc_msmt_rv_sensing?: number | null
  mdc_idc_msmt_rv_pacing_threshold?: number | null
  mdc_idc_msmt_rv_pw?: number | null
  mdc_idc_msmt_hv_impedance_mean?: number | null
  // LV measurements
  mdc_idc_msmt_lv_impedance_mean?: number | null
  mdc_idc_msmt_lv_sensing?: number | null
  mdc_idc_msmt_lv_pacing_threshold?: number | null
  mdc_idc_msmt_lv_pw?: number | null
  // Tachycardia settings
  VT1_active?: string | null
  VT1_detection_interval?: string | null
  VT1_therapy_1_atp?: string;
  VT1_therapy_1_no_bursts?: string;
  VT1_therapy_2_atp?: string;
  VT1_therapy_2_no_bursts?: string;
  VT1_therapy_3_cvrt?: string;
  VT1_therapy_3_energy?: string;
  VT1_therapy_4_cvrt?: string;
  VT1_therapy_4_energy?: string;
  VT1_therapy_5_cvrt?: string;
  VT1_therapy_5_energy?: string;
  VT1_therapy_5_max_num_shocks?: string;
  // VT2 Settings
  VT2_active?: string | null;
  VT2_detection_interval?: string | null;
  VT2_therapy_1_atp?: string | null;
  VT2_therapy_1_no_bursts?: string | null;
  VT2_therapy_2_atp?: string | null;
  VT2_therapy_2_no_bursts?: string | null;
  VT2_therapy_3_cvrt?: string | null;
  VT2_therapy_3_energy?: string | null;
  VT2_therapy_4_cvrt?: string | null;
  VT2_therapy_4_energy?: string | null;
  VT2_therapy_5_cvrt?: string | null;
  VT2_therapy_5_energy?: string | null;
  VT2_therapy_5_max_num_shocks?: string | null;
  //  VF Settings
  VF_active?: string | null;
  VF_detection_interval?: string | null;
  VF_therapy_1_atp?: string | null;
  VF_therapy_1_no_bursts?: string | null;
  VF_therapy_2_energy?: string | null;
  VF_therapy_3_energy?: string | null;
  VF_therapy_4_energy?: string | null;
  VF_therapy_4_max_num_shocks?: string | null;
  // Report info
  comments?: string | null
  isCompleted?: boolean | null
  completedByUserId?: number | null
  completedByName?: string | null
  completedBySignature?: string | null
  file_path?: string | null
  file_url?: string | null
  createdAt: string
  // Relational data
  arrhythmias: Arrhythmia[]
  tags: Tag[]
}

// The rest of the store remains largely the same
interface ReportState {
  reports: Report[]
  currentReport: Report | null
  loading: boolean
  error: string | null

  // Actions
  fetchReportsForPatient: (patientId: number) => Promise<void>
  fetchReport: (reportId: number) => Promise<void>
  fetchMostRecentReport: (patientId: number) => Promise<Report | null>
  // createReport: (data: Partial<Report>) => Promise<Report>
  // updateReport: (id: number, data: Partial<Report>) => Promise<Report>
  setCurrentReport: (report: Report) => void
  deleteReport: (reportId: number) => Promise<void>
  clearError: () => void
}

export const useReportStore = create<ReportState>((set) => ({
  reports: [],
  currentReport: null,
  loading: false,
  error: null,
  clearError: () => set({ error: null }),

  fetchReportsForPatient: async (patientId) => {
    set({ loading: true, error: null })
    try {
      // console.log(`Fetching reports for patient ID: ${patientId}`)
      const response = await api.get(`/patients/${patientId}/reports`)
      // console.log('Reports fetched:', response.data)
      set({ reports: response.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch reports', loading: false, reports: [] })
    }
  },

  setCurrentReport: (report: Report) => set({ currentReport: report }),

  fetchReport: async (reportId) => {
    set({ loading: true, error: null, currentReport: null })
    try {
      const response = await api.get(`/reports/${reportId}`)
      set({ currentReport: response.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch report', loading: false })
    }
  },

  fetchMostRecentReport: async (patientId) => {
    try {
      const response = await api.get(`/patients/${patientId}/reports`, {
        params: {
          limit: 1,
          sort: 'reportDate',
          order: 'desc',
          includeDeleted: false,
          full: true,
        },
      })

      const reports = response.data?.reports || response.data
      if (Array.isArray(reports) && reports.length > 0) {
        return reports[0]
      }
      return null
    } catch (error) {
      console.error('Failed to fetch most recent report:', error)
      return null
    }
  },

  createReport: async (data: Partial<Report>) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post('/reports', data)
      const newReport = response.data
      set(state => ({
        reports: [newReport, ...state.reports],
        loading: false
      }))
      return newReport
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to create report', loading: false })
      throw error
    }
  },

  updateReport: async (id: number, data: Partial<Report>) => {
    set({ loading: true, error: null })
    try {
      const response = await api.put(`/reports/${id}`, data)
      const updatedReport = response.data
      set(state => ({
        reports: state.reports.map(r => r.id === id ? updatedReport : r),
        currentReport: state.currentReport?.id === id ? updatedReport : state.currentReport,
        loading: false
      }))
      return updatedReport
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update report', loading: false })
      throw error
    }
  },

  deleteReport: async (reportId) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/reports/${reportId}`)
      set(state => ({
        reports: state.reports.filter(r => r.id !== reportId),
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete report', loading: false })
      throw err
    }
  },
}))