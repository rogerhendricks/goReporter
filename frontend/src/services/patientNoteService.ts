import api from '../utils/axios'

export interface PatientNote {
  id: number
  patientId: number
  userId: number
  content: string
  createdAt: string
  updatedAt: string
  user: {
    id: number
    fullName: string
    email: string
  }
}

export interface CreateNoteInput {
  content: string
}

export interface PaginatedNotesResponse {
  notes: PatientNote[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const patientNoteService = {
  getAll: async (patientId: number, page: number = 1, limit: number = 8): Promise<PaginatedNotesResponse> => {
    const response = await api.get<PaginatedNotesResponse>(`/patients/${patientId}/notes`, {
      params: { page, limit }
    })
    return response.data
  },

  create: async (patientId: number, note: CreateNoteInput): Promise<PatientNote> => {
    const response = await api.post<PatientNote>(`/patients/${patientId}/notes`, note)
    return response.data
  },

  update: async (patientId: number, noteId: number, note: CreateNoteInput): Promise<PatientNote> => {
    const response = await api.put<PatientNote>(`/patients/${patientId}/notes/${noteId}`, note)
    return response.data
  },

  delete: async (patientId: number, noteId: number): Promise<void> => {
    await api.delete(`/patients/${patientId}/notes/${noteId}`)
  },
}
