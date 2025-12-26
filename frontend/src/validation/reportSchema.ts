import { z } from 'zod'

// Helper validators for common device ranges
const batteryVoltage = z.number()
  .min(2.0, 'Battery voltage must be at least 2.0V')
  .max(3.5, 'Battery voltage cannot exceed 3.5V')

const percentage = z.number()
  .min(0, 'Percentage must be between 0 and 100')
  .max(100, 'Percentage must be between 0 and 100')

const heartRate = z.number()
  .min(20, 'Heart rate must be at least 20 bpm')
  .max(300, 'Heart rate cannot exceed 300 bpm')

const impedance = z.number()
  .min(200, 'Impedance must be at least 200 ohms')
  .max(3000, 'Impedance cannot exceed 3000 ohms')

const sensingAmplitude = z.number()
  .min(0.1, 'Sensing amplitude must be at least 0.1 mV')
  .max(30, 'Sensing amplitude cannot exceed 30 mV')

const pacingThreshold = z.number()
  .min(0.1, 'Pacing threshold must be at least 0.1 V')
  .max(5, 'Pacing threshold cannot exceed 5 V')

const pulseWidth = z.number()
  .min(0.1, 'Pulse width must be at least 0.1 ms')
  .max(2.0, 'Pulse width cannot exceed 2.0 ms')

const shockEnergy = z.number()
  .min(1, 'Shock energy must be at least 1 J')
  .max(40, 'Shock energy cannot exceed 40 J')

const detectionInterval = z.number()
  .min(200, 'Detection interval must be at least 200 ms')
  .max(1000, 'Detection interval cannot exceed 1000 ms')

const chargeTime = z.number()
  .min(1, 'Charge time must be at least 1 second')
  .max(30, 'Charge time cannot exceed 30 seconds')

const avDelay = z.string()
  .regex(/^\d+$/, 'AV delay must be a number in milliseconds')
  .refine(val => {
    const num = parseInt(val)
    return num >= 30 && num <= 300
  }, 'AV delay must be between 30-300 ms')

const qrsDuration = z.number()
  .min(60, 'QRS duration must be at least 60 ms')
  .max(300, 'QRS duration cannot exceed 300 ms')

// Arrhythmia schema
export const arrhythmiaSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Arrhythmia name is required'),
  symptoms: z.string(),
  rate: z.union([
    z.string(),
    z.number().min(20, 'Rate must be at least 20 bpm').max(400, 'Rate cannot exceed 400 bpm')
  ]),
  termination: z.string(),
  therapies: z.string(),
})

// Tag schema
const tagSchema = z.object({
  ID: z.number(),
  name: z.string(),
  color: z.string(),
  description: z.string().optional(),
})

// Main report schema
export const reportSchema = z.object({
  // Report metadata
  id: z.number().optional(),
  patientId: z.number(),
  reportDate: z.union([z.date(), z.string()]),
  reportType: z.string().min(1, 'Report type is required'),
  reportStatus: z.string().min(1, 'Report status is required'),
  isCompleted: z.boolean().optional(),
  comments: z.string().optional(),
  file_path: z.string().optional(),
  qrs_duration: qrsDuration.optional().nullable(),
  
  // Patient substrate
  currentHeartRate: heartRate.optional().nullable(),
  currentRhythm: z.string().optional().nullable(),
  currentDependency: z.string().optional().nullable(),
  mdc_idc_stat_ataf_burden_percent: percentage.optional().nullable(),
  
  // Device Settings (Bradycardia)
  mdc_idc_set_brady_mode: z.string().optional().nullable(),
  mdc_idc_set_brady_lowrate: heartRate.optional().nullable(),
  mdc_idc_set_brady_max_tracking_rate: heartRate.optional().nullable(),
  mdc_idc_set_brady_max_sensor_rate: heartRate.optional().nullable(),
  mdc_idc_dev_sav: avDelay.optional().nullable(),
  mdc_idc_dev_pav: avDelay.optional().nullable(),
  
  // Pacing Percentages
  mdc_idc_stat_brady_ra_percent_paced: percentage.optional().nullable(),
  mdc_idc_stat_brady_rv_percent_paced: percentage.optional().nullable(),
  mdc_idc_stat_brady_lv_percent_paced: percentage.optional().nullable(),
  mdc_idc_stat_brady_biv_percent_paced: percentage.optional().nullable(),
  
  // Battery/Device Diagnostics
  mdc_idc_batt_volt: batteryVoltage.optional().nullable(),
  mdc_idc_batt_remaining: z.number()
    .min(0, 'Battery remaining must be positive')
    .max(240, 'Battery remaining cannot exceed 240 months')
    .optional().nullable(),
  mdc_idc_batt_percentage: percentage.optional().nullable(),
  mdc_idc_batt_status: z.string().optional().nullable(),
  mdc_idc_cap_charge_time: chargeTime.optional().nullable(),
  
  // RA (Right Atrium) Measurements
  mdc_idc_msmt_ra_impedance_mean: impedance.optional().nullable(),
  mdc_idc_msmt_ra_sensing: sensingAmplitude.optional().nullable(),
  mdc_idc_msmt_ra_pacing_threshold: pacingThreshold.optional().nullable(),
  mdc_idc_msmt_ra_pw: pulseWidth.optional().nullable(),
  
  // RV (Right Ventricle) Measurements
  mdc_idc_msmt_rv_impedance_mean: impedance.optional().nullable(),
  mdc_idc_msmt_rv_sensing: sensingAmplitude.optional().nullable(),
  mdc_idc_msmt_rv_pacing_threshold: pacingThreshold.optional().nullable(),
  mdc_idc_msmt_rv_pw: pulseWidth.optional().nullable(),
  mdc_idc_msmt_shock_impedance: z.number()
    .min(20, 'Shock impedance must be at least 20 ohms')
    .max(200, 'Shock impedance cannot exceed 200 ohms')
    .optional().nullable(),
  
  // LV (Left Ventricle) Measurements
  mdc_idc_msmt_lv_impedance_mean: impedance.optional().nullable(),
  mdc_idc_msmt_lv_sensing: sensingAmplitude.optional().nullable(),
  mdc_idc_msmt_lv_pacing_threshold: pacingThreshold.optional().nullable(),
  mdc_idc_msmt_lv_pw: pulseWidth.optional().nullable(),
  
  // VT1 (Ventricular Tachycardia Zone 1) Settings
  VT1_detection_interval: detectionInterval.optional().nullable(),
  VT1_therapy_1_atp: z.string().optional().nullable(),
  VT1_therapy_1_no_bursts: z.number()
    .min(1, 'Number of bursts must be at least 1')
    .max(8, 'Number of bursts cannot exceed 8')
    .optional().nullable(),
  VT1_therapy_2_atp: z.string().optional().nullable(),
  VT1_therapy_2_no_bursts: z.number().min(1).max(8).optional().nullable(),
  VT1_therapy_3_cvrt: z.string().optional().nullable(),
  VT1_therapy_3_energy: shockEnergy.optional().nullable(),
  VT1_therapy_4_cvrt: z.string().optional().nullable(),
  VT1_therapy_4_energy: shockEnergy.optional().nullable(),
  VT1_therapy_5_cvrt: z.string().optional().nullable(),
  VT1_therapy_5_energy: shockEnergy.optional().nullable(),
  VT1_therapy_5_max_num_shocks: z.number()
    .min(1, 'Max shocks must be at least 1')
    .max(6, 'Max shocks cannot exceed 6')
    .optional().nullable(),
  
  // VT2 (Ventricular Tachycardia Zone 2) Settings
  VT2_detection_interval: detectionInterval.optional().nullable(),
  VT2_therapy_1_atp: z.string().optional().nullable(),
  VT2_therapy_1_no_bursts: z.number().min(1).max(8).optional().nullable(),
  VT2_therapy_2_atp: z.string().optional().nullable(),
  VT2_therapy_2_no_bursts: z.number().min(1).max(8).optional().nullable(),
  VT2_therapy_3_cvrt: z.string().optional().nullable(),
  VT2_therapy_3_energy: shockEnergy.optional().nullable(),
  VT2_therapy_4_cvrt: z.string().optional().nullable(),
  VT2_therapy_4_energy: shockEnergy.optional().nullable(),
  VT2_therapy_5_cvrt: z.string().optional().nullable(),
  VT2_therapy_5_energy: shockEnergy.optional().nullable(),
  VT2_therapy_5_max_num_shocks: z.number().min(1).max(6).optional().nullable(),
  
  // VF (Ventricular Fibrillation) Settings
  VF_detection_interval: detectionInterval.optional().nullable(),
  VF_therapy_1_atp: z.string().optional().nullable(),
  VF_therapy_1_no_bursts: z.number().min(1).max(8).optional().nullable(),
  VF_therapy_2_energy: shockEnergy.optional().nullable(),
  VF_therapy_3_energy: shockEnergy.optional().nullable(),
  VF_therapy_4_energy: shockEnergy.optional().nullable(),
  VF_therapy_4_max_num_shocks: z.number().min(1).max(6).optional().nullable(),
  
  // Arrhythmias and Tags
  arrhythmias: z.array(arrhythmiaSchema).optional(),
  tags: z.array(tagSchema).optional(),
})

export type ReportFormData = z.infer<typeof reportSchema>
export type ArrhythmiaFormData = z.infer<typeof arrhythmiaSchema>

// Field-level validators for real-time validation
export const fieldValidators = {
  // Battery validators
  batteryVoltage: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 2.0) return { isValid: false, error: 'Battery voltage must be at least 2.0V' }
    if (value > 3.5) return { isValid: false, error: 'Battery voltage cannot exceed 3.5V' }
    return { isValid: true }
  },
  
  // Percentage validator
  percentage: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 0 || value > 100) return { isValid: false, error: 'Must be between 0-100%' }
    return { isValid: true }
  },
  
  // Heart rate validator
  heartRate: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 20) return { isValid: false, error: 'Heart rate must be at least 20 bpm' }
    if (value > 300) return { isValid: false, error: 'Heart rate cannot exceed 300 bpm' }
    return { isValid: true }
  },
  
  // Impedance validator
  impedance: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 200) return { isValid: false, error: 'Impedance must be at least 200Ω' }
    if (value > 3000) return { isValid: false, error: 'Impedance cannot exceed 3000Ω' }
    return { isValid: true }
  },
  
  // Sensing amplitude validator
  sensing: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 0.1) return { isValid: false, error: 'Sensing must be at least 0.1 mV' }
    if (value > 30) return { isValid: false, error: 'Sensing cannot exceed 30 mV' }
    return { isValid: true }
  },
  
  // Pacing threshold validator
  threshold: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 0.1) return { isValid: false, error: 'Threshold must be at least 0.1 V' }
    if (value > 5) return { isValid: false, error: 'Threshold cannot exceed 5 V' }
    return { isValid: true }
  },
  
  // Pulse width validator
  pulseWidth: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 0.1) return { isValid: false, error: 'Pulse width must be at least 0.1 ms' }
    if (value > 2.0) return { isValid: false, error: 'Pulse width cannot exceed 2.0 ms' }
    return { isValid: true }
  },
  
  // Shock impedance validator
  shockImpedance: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 20) return { isValid: false, error: 'Shock impedance must be at least 20Ω' }
    if (value > 200) return { isValid: false, error: 'Shock impedance cannot exceed 200Ω' }
    return { isValid: true }
  },
  
  // Shock energy validator
  shockEnergy: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 1) return { isValid: false, error: 'Shock energy must be at least 1 J' }
    if (value > 40) return { isValid: false, error: 'Shock energy cannot exceed 40 J' }
    return { isValid: true }
  },
  
  // Detection interval validator
  detectionInterval: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 200) return { isValid: false, error: 'Detection interval must be at least 200 ms' }
    if (value > 1000) return { isValid: false, error: 'Detection interval cannot exceed 1000 ms' }
    return { isValid: true }
  },
  
  // Charge time validator
  chargeTime: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 1) return { isValid: false, error: 'Charge time must be at least 1 second' }
    if (value > 30) return { isValid: false, error: 'Charge time cannot exceed 30 seconds' }
    return { isValid: true }
  },
  
  // QRS duration validator
  qrsDuration: (value: number | null | undefined) => {
    if (value === null || value === undefined) return { isValid: true }
    if (value < 60) return { isValid: false, error: 'QRS duration must be at least 60 ms' }
    if (value > 300) return { isValid: false, error: 'QRS duration cannot exceed 300 ms' }
    return { isValid: true }
  },
}
