import api from '@/utils/axios'

export type AppointmentStatus = 'scheduled' | 'arrived' | 'cancelled' | 'completed'
export type AppointmentLocation = 'remote' | 'televisit' | 'clinic'

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
  location?: AppointmentLocation
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
  location?: AppointmentLocation
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

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AdminAppointmentsParams {
  page?: number
  limit?: number
  filter?: 'missed' | ''
}

export interface PaginatedAppointmentsResponse {
  data: Appointment[]
  pagination: Pagination
  graceMinutes?: number
}

export interface AppointmentSlot {
  slotTime: string
  remaining: number
  total: number
}

export interface AvailableSlotsParams {
  start: string
  end: string
  location?: AppointmentLocation
}

async function getAppointments(params?: AppointmentQueryParams): Promise<Appointment[]> {
  const { data } = await api.get('/appointments', { params })
  return data
}

async function getPatientAppointments(patientId: number): Promise<Appointment[]> {
  const { data } = await api.get(`/patients/${patientId}/appointments`)
  return data
}

async function getAdminAppointments(
  params: AdminAppointmentsParams = {},
): Promise<PaginatedAppointmentsResponse> {
  const { page = 1, limit = 15, filter = 'missed' } = params
  const { data } = await api.get('/admin/appointments', {
    params: { page, limit, filter },
  })
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

async function getAvailableSlots(params: AvailableSlotsParams): Promise<AppointmentSlot[]> {
  const { data } = await api.get('/appointments/slots/available', { 
    params: {
      start: params.start,
      end: params.end,
      location: params.location || 'clinic'
    }
  })
  return data
}

export const appointmentService = {
  getAppointments,
  getPatientAppointments,
  getAdminAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAvailableSlots,
}
