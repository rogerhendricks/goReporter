import api from '@/utils/axios'

export interface SavedSearchFilter {
  id?: number
  userId?: string
  name: string
  description: string
  filters: any
  isDefault: boolean
  createdAt?: string
  updatedAt?: string
}

export interface SearchHistory {
  id: number
  userId: string
  query: string
  filters: any
  results: number
  createdAt: string
}

class SearchFilterService {
  /**
   * Get all saved search filters for the current user
   */
  async getAll(): Promise<SavedSearchFilter[]> {
    const response = await api.get<SavedSearchFilter[]>('/search/filters')
    return response.data
  }

  /**
   * Save a new search filter
   */
  async save(filter: Omit<SavedSearchFilter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<SavedSearchFilter> {
    const response = await api.post<SavedSearchFilter>('/search/filters', filter)
    return response.data
  }

  /**
   * Update an existing search filter
   */
  async update(id: number, filter: Partial<SavedSearchFilter>): Promise<SavedSearchFilter> {
    const response = await api.put<SavedSearchFilter>(`/search/filters/${id}`, filter)
    return response.data
  }

  /**
   * Delete a saved search filter
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/search/filters/${id}`)
  }

  /**
   * Get search history
   */
  async getHistory(limit: number = 10): Promise<SearchHistory[]> {
    const response = await api.get<SearchHistory[]>(`/search/history`, {
      params: { limit }
    })
    return response.data
  }

  /**
   * Get search suggestions based on query
   */
  async getSuggestions(query: string): Promise<string[]> {
    const response = await api.get<string[]>('/search/suggestions', {
      params: { q: query }
    })
    return response.data
  }
}

export const searchFilterService = new SearchFilterService()