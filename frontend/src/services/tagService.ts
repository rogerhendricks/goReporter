import api from '../utils/axios'

export type TagType = 'patient' | 'report';

export interface Tag {
  ID: number;
  name: string;
  type: TagType;
  color: string;
  description: string;
}

export const tagService = {
  getAll: async (type?: TagType | 'all') => {
    const params = type ? { type } : {};
    const response = await api.get<Tag[]>('/tags', { params });
    return response.data;
  },

  create: async (tag: Omit<Tag, 'ID'>) => {
    const response = await api.post<Tag>('/tags', tag);
    return response.data;
  },

  update: async (id: number, tag: Partial<Tag>) => {
    const response = await api.put<Tag>(`/tags/${id}`, tag);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/tags/${id}`);
  },

  getPatientStats: async (tagId: number) => {
    const response = await api.get(`/tags/stats?tagId=${tagId}`);
    return response.data;
  },

  getReportStats: async (tagId: number) => {
    const response = await api.get(`/tags/report-stats?tagId=${tagId}`);
    return response.data;
  },
};
