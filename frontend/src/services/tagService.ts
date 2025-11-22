import api from '../utils/axios'

export interface Tag {
  ID: number;
  name: string;
  color: string;
  description: string;
}

export const tagService = {
  getAll: async () => {
    const response = await api.get<Tag[]>('/tags');
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
};
