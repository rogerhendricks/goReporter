import api from '@/utils/axios'

export type EntityType = 'patient' | 'device' | 'report' | 'doctor' | 'task' | 'lead' | 'all'

export interface GlobalSearchResult {
  type: EntityType
  id: number
  title: string
  subtitle: string
  description: string
  url: string
  data: any
  score: number
}

export interface GlobalSearchResponse {
  results: GlobalSearchResult[]
  total: number
  query: string
}

export interface GlobalSearchParams {
  q: string
  type?: EntityType
  limit?: number
  offset?: number
  filters?: string[]
}

class GlobalSearchService {
  private searchHistoryKey = 'globalSearchHistory'
  private maxHistoryItems = 20

  /**
   * Perform a global search across all entities
   */
  async search(params: GlobalSearchParams): Promise<GlobalSearchResponse> {
    const response = await api.get<GlobalSearchResponse>('/search/global', {
      params: {
        q: params.q,
        type: params.type === 'all' ? undefined : params.type,
        limit: params.limit || 20,
        offset: params.offset || 0,
        filters: params.filters,
      },
    })

    // Save to search history
    if (params.q) {
      this.addToHistory(params.q)
    }

    return response.data
  }

  /**
   * Get search history
   */
  getHistory(): string[] {
    try {
      const history = localStorage.getItem(this.searchHistoryKey)
      return history ? JSON.parse(history) : []
    } catch (error) {
      console.error('Failed to load search history:', error)
      return []
    }
  }

  /**
   * Add query to search history
   */
  private addToHistory(query: string): void {
    try {
      const history = this.getHistory()
      
      // Remove if already exists
      const filtered = history.filter(item => item !== query)
      
      // Add to beginning
      filtered.unshift(query)
      
      // Keep only max items
      const trimmed = filtered.slice(0, this.maxHistoryItems)
      
      localStorage.setItem(this.searchHistoryKey, JSON.stringify(trimmed))
    } catch (error) {
      console.error('Failed to save search history:', error)
    }
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    try {
      localStorage.removeItem(this.searchHistoryKey)
    } catch (error) {
      console.error('Failed to clear search history:', error)
    }
  }

  /**
   * Get icon name for entity type
   */
  getEntityIcon(type: EntityType): string {
    const icons: Record<EntityType, string> = {
      patient: 'User',
      device: 'Heart',
      report: 'FileText',
      doctor: 'Stethoscope',
      task: 'CheckSquare',
      lead: 'Zap',
      all: 'Search',
    }
    return icons[type] || 'Circle'
  }

  /**
   * Get display color for entity type
   */
  getEntityColor(type: EntityType): string {
    const colors: Record<EntityType, string> = {
      patient: 'bg-blue-500',
      device: 'bg-green-500',
      report: 'bg-purple-500',
      doctor: 'bg-orange-500',
      task: 'bg-pink-500',
      lead: 'bg-cyan-500',
      all: 'bg-gray-500',
    }
    return colors[type] || 'bg-gray-500'
  }

  /**
   * Get display label for entity type
   */
  getEntityLabel(type: EntityType): string {
    const labels: Record<EntityType, string> = {
      patient: 'Patient',
      device: 'Device',
      report: 'Report',
      doctor: 'Doctor',
      task: 'Task',
      lead: 'Lead',
      all: 'All',
    }
    return labels[type] || type
  }
}

export const globalSearchService = new GlobalSearchService()
