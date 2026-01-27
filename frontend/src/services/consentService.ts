import api from '../utils/axios'

export type ConsentType =
  | 'REMOTE_HOME_MONITORING'
  | 'TREATMENT'
  | 'DATA_SHARING'
  | 'RESEARCH'
  | 'THIRD_PARTY'
  | 'ELECTRONIC_COMMUNICATION'
  | 'PHOTO_VIDEO'

export type ConsentStatus = 'GRANTED' | 'REVOKED' | 'EXPIRED'

export interface PatientConsent {
  ID: number
  patientId: number
  consentType: ConsentType
  status: ConsentStatus
  grantedDate: string
  revokedDate?: string
  expiryDate?: string
  grantedBy: string
  revokedBy?: string
  notes?: string
  documentPath?: string
  ipAddress?: string
  userAgent?: string
  termsAccepted?: boolean
  termsAcceptedAt?: string
  termsVersion?: string
  CreatedAt?: string
  UpdatedAt?: string
}

export interface CreateConsentRequest {
  patientId: number
  consentType: ConsentType
  expiryDate?: string
  notes?: string
  documentPath?: string
  termsAccepted: boolean
  termsVersion: string
}

export interface ConsentStats {
  total: number
  active: number
  revoked: number
  expired: number
  byType: Array<{
    consentType: ConsentType
    count: number
  }>
}

export const CONSENT_LANGUAGES: Record<string, string> = {
  en: 'English',
  zh: 'Mandarin',
  yue: 'Cantonese',
  es: 'Spanish',
  el: 'Greek',
  ar: 'Arabic',
}

const DEFAULT_CONSENT_LANGUAGE = 'en'

export const consentService = {
  // Get terms and conditions for a consent type
  getTerms: async (consentType: ConsentType, language: keyof typeof CONSENT_LANGUAGES = DEFAULT_CONSENT_LANGUAGE): Promise<string> => {
    const paths = language === DEFAULT_CONSENT_LANGUAGE
      ? [`/terms/${consentType}.md`]
      : [`/terms/${language}/${consentType}.md`, `/terms/${consentType}.md`]

    for (const path of paths) {
      try {
        const response = await fetch(path)
        if (!response.ok) {
          throw new Error(`Terms not found for ${path}`)
        }
        return await response.text()
      } catch (error) {
        console.warn('Error fetching terms:', error)
      }
    }

    console.error('All term fetch attempts failed')
    return '# Terms and Conditions\n\nTerms and conditions for this consent type are currently unavailable.'
  },

  // Get all consents for a patient
  getPatientConsents: async (patientId: number): Promise<PatientConsent[]> => {
    const response = await api.get(`/patients/${patientId}/consents`)
    return response.data
  },

  // Get active consents for a patient
  getActiveConsents: async (patientId: number): Promise<PatientConsent[]> => {
    const response = await api.get(`/patients/${patientId}/consents/active`)
    return response.data
  },

  // Create a new consent
  createConsent: async (data: CreateConsentRequest): Promise<PatientConsent> => {
    const response = await api.post(`/patients/${data.patientId}/consents`, data)
    return response.data
  },

  // Update a consent
  updateConsent: async (consentId: number, data: Partial<PatientConsent>): Promise<PatientConsent> => {
    const response = await api.put(`/consents/${consentId}`, data)
    return response.data
  },

  // Revoke a consent
  revokeConsent: async (consentId: number, notes?: string): Promise<void> => {
    await api.post(`/consents/${consentId}/revoke`, { notes })
  },

  // Check consent status
  checkConsentStatus: async (
    patientId: number,
    consentType: ConsentType
  ): Promise<{ hasConsent: boolean }> => {
    const response = await api.get(`/patients/${patientId}/consents/check`, {
      params: { type: consentType },
    })
    return response.data
  },

  // Delete a consent (admin only)
  deleteConsent: async (consentId: number): Promise<void> => {
    await api.delete(`/consents/${consentId}`)
  },

  // Get consent statistics (admin only)
  getConsentStats: async (): Promise<ConsentStats> => {
    const response = await api.get('/admin/consents/stats')
    return response.data
  },

  // Get consents by date range (admin only)
  getConsentsByDateRange: async (startDate: string, endDate: string): Promise<PatientConsent[]> => {
    const response = await api.get('/admin/consents/range', {
      params: { startDate, endDate },
    })
    return response.data
  },

  // Re-accept terms for an existing consent
  reacceptTerms: async (
    consentId: number, 
    termsVersion: string
  ): Promise<PatientConsent> => {
    const response = await api.post(`/consents/${consentId}/reaccept-terms`, {
      termsAccepted: true,
      termsVersion,
    })
    return response.data
  },

  // Update consent with optional terms re-acceptance
  updateConsentWithTerms: async (
    consentId: number,
    data: {
      consentType?: ConsentType
      expiryDate?: string
      notes?: string
      termsAccepted?: boolean
      termsVersion?: string
    }
  ): Promise<PatientConsent> => {
    const response = await api.put(`/consents/${consentId}`, data)
    return response.data
  },

}