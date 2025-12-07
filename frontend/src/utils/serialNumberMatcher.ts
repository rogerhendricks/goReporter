import axios from '@/utils/axios'

export interface SerialNumberMatch {
  serialNumber: string
  patientId?: number
  patientName?: string
  deviceType?: string
  found: boolean
  error?: string
}

export interface SerialNumberMatchResult {
  matches: SerialNumberMatch[]
  totalFound: number
  totalNotFound: number
}

/**
 * Search for patients by device or lead serial numbers
 * @param serialNumbers - Array of serial numbers to search for
 * @returns Promise with match results
 */
export async function findPatientsBySerialNumbers(
  serialNumbers: string[]
): Promise<SerialNumberMatchResult> {
  const matches: SerialNumberMatch[] = []
  let totalFound = 0
  let totalNotFound = 0

  // Remove duplicates and empty strings
  const uniqueSerialNumbers = [...new Set(serialNumbers)]
    .map(s => s.trim())
    .filter(s => s.length > 0)

  for (const serialNumber of uniqueSerialNumbers) {
    try {
      // Search for the serial number
      const response = await axios.get('/search/patients', {
        params: {
          deviceSerial: serialNumber,
          leadSerial: serialNumber
        }
      })

      const patients = response.data

      if (patients && patients.length > 0) {
        // Found patient(s) with this serial number
        const patient = patients[0] // Take first match if multiple
        
        // Determine device type by checking which field matched
        let deviceType = 'Unknown'
        if (patient.implanted_devices?.some((d: any) => d.serial_number === serialNumber)) {
          deviceType = 'Device'
        } else if (patient.implanted_leads?.some((l: any) => l.serial_number === serialNumber)) {
          deviceType = 'Lead'
        }

        matches.push({
          serialNumber,
          patientId: patient.id,
          patientName: `${patient.fname} ${patient.lname}`,
          deviceType,
          found: true
        })
        totalFound++
      } else {
        // No patient found with this serial number
        matches.push({
          serialNumber,
          found: false
        })
        totalNotFound++
      }
    } catch (error: any) {
      matches.push({
        serialNumber,
        found: false,
        error: error.response?.data?.error || 'Search failed'
      })
      totalNotFound++
    }
  }

  return {
    matches,
    totalFound,
    totalNotFound
  }
}

/**
 * Parse serial numbers from text (supports comma, space, or newline separated)
 * @param text - Text containing serial numbers
 * @returns Array of serial numbers
 */
export function parseSerialNumbers(text: string): string[] {
  return text
    .split(/[,\n\s]+/) // Split by comma, newline, or space
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Assign a task template to multiple patients by their IDs
 * @param templateId - The task template ID
 * @param patientIds - Array of patient IDs
 * @param dueDate - Optional due date override
 * @returns Promise with assignment results
 */
export async function assignTemplateToPatients(
  templateId: number,
  patientIds: number[],
  dueDate?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const patientId of patientIds) {
    try {
      await axios.post(`/task-templates/${templateId}/assign`, {
        patientId,
        dueDate
      })
      success++
    } catch (error: any) {
      failed++
      errors.push(`Patient ID ${patientId}: ${error.response?.data?.error || 'Unknown error'}`)
    }
  }

  return { success, failed, errors }
}