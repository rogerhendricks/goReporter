import api from '@/utils/axios'

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled'

export interface AppointmentPatientSummary {
  id: number
  fname?: string
  lname?: string
  mrn?: number
}

export interface Appointment {
  id: number
  title: string
  description?: string
  location?: string
  status: AppointmentStatus
  startAt: string
  endAt?: string | null
  patientId: number
  patient?: AppointmentPatientSummary
  createdById: number
  createdAt: string
  updatedAt: string
}

export interface AppointmentPayload {
  title: string
  description?: string
  location?: string
  status?: AppointmentStatus
  startAt: string
  endAt?: string | null
  patientId: number
}

export interface AppointmentQueryParams {
  patientId?: number
  start?: string
  end?: string
}

async function getAppointments(params?: AppointmentQueryParams): Promise<Appointment[]> {
  const { data } = await api.get('/appointments', { params })
  return data
}

async function getPatientAppointments(patientId: number): Promise<Appointment[]> {
  const { data } = await api.get(`/patients/${patientId}/appointments`)
  return data
}

async function createAppointment(payload: AppointmentPayload): Promise<Appointment> {
  const { data } = await api.post('/appointments', payload)
  return data
}

async function updateAppointment(id: number, payload: Partial<AppointmentPayload>): Promise<Appointment> {
  const { data } = await api.put(`/appointments/${id}`, payload)
  return data
}

async function deleteAppointment(id: number): Promise<void> {
  await api.delete(`/appointments/${id}`)
}

export const appointmentService = {
  getAppointments,
  getPatientAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
}
