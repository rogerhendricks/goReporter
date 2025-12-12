import { create } from 'zustand'
import axios from '@/utils/axios'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TaskNote {
  id: number
  taskId: number
  content: string
  createdBy: {
    ID: number
    username: string
    fullName: string
  }
  updatedByUser?: {
    ID: number
    username: string
    fullName: string
  }
  createdAt: string
  updatedAt?: string
  updatedBy?: number
}

export interface Task {
  id: number
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  completedAt?: string
  patientId?: number
  patient?: {
    id: number
    fname: string
    lname: string
  }
  assignedToId?: number
  assignedTo?: {
    id: number
    role: string
    email: string
    username: string
    fullName: string
  }
  createdById: number
  createdBy: {
    id: number
    email: string
    username: string
    fullName: string
    role: string
  }
  tags: Array<{
    ID: number
    name: string
    color: string
  }>
  notes: TaskNote[]
  createdAt: string
  updatedAt: string
}

export interface CreateTaskData {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: Date
  patientId?: number
  assignedToId?: number
  tagIds?: number[]
}

export interface UpdateTaskData {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: Date
  assignedToId?: number
  tagIds?: number[]
}

interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  patientId?: number
  assignedTo?: number
}

interface TaskStore {
  tasks: Task[]
  currentTask: Task | null
  isLoading: boolean
  error: string | null
  
  fetchTasks: (filters?: TaskFilters) => Promise<void>
  fetchTask: (id: number) => Promise<void>
  fetchTasksByPatient: (patientId: number) => Promise<void>
  createTask: (data: CreateTaskData) => Promise<Task | null>
  updateTask: (id: number, data: UpdateTaskData) => Promise<Task | null>
  deleteTask: (id: number) => Promise<boolean>
  addNote: (taskId: number, content: string) => Promise<TaskNote | null>
  updateNote: (taskId: number, noteId: number, content: string) => Promise<boolean>
  deleteNote: (taskId: number, noteId: number) => Promise<boolean>
  setCurrentTask: (task: Task | null) => void
  clearError: () => void
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,
  error: null,

  fetchTasks: async (filters?: TaskFilters) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.priority) params.append('priority', filters.priority)
      if (filters?.patientId) params.append('patientId', filters.patientId.toString())
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo.toString())
      
      const response = await axios.get(`/tasks?${params.toString()}`)
      set({ tasks: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch tasks', isLoading: false })
    }
  },

  fetchTask: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.get(`/tasks/${id}`)
      set({ currentTask: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch task', isLoading: false })
    }
  },

  fetchTasksByPatient: async (patientId: number) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.get(`/patients/${patientId}/tasks`)
      set({ tasks: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch tasks', isLoading: false })
    }
  },

  createTask: async (data: CreateTaskData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.post('/tasks', data)
      set((state) => ({ 
        tasks: [...state.tasks, response.data],
        isLoading: false 
      }))
      return response.data
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to create task', isLoading: false })
      return null
    }
  },

  updateTask: async (id: number, data: UpdateTaskData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.put(`/tasks/${id}`, data)
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? response.data : t),
        currentTask: state.currentTask?.id === id ? response.data : state.currentTask,
        isLoading: false
      }))
      return response.data
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to update task'
      set({ error: errorMsg, isLoading: false })
      console.error('Update task error:', errorMsg)
      return null
    }
  },

  deleteTask: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      await axios.delete(`/tasks/${id}`)
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id),
        currentTask: state.currentTask?.id === id ? null : state.currentTask,
        isLoading: false
      }))
      return true
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to delete task', isLoading: false })
      return false
    }
  },

  addNote: async (taskId: number, content: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.post(`/tasks/${taskId}/notes`, { content })
      set((state) => ({
        currentTask: state.currentTask?.id === taskId 
          ? { ...state.currentTask, notes: [...state.currentTask.notes, response.data] }
          : state.currentTask,
        isLoading: false
      }))
      return response.data
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to add note', isLoading: false })
      return null
    }
  },


  updateNote: async (taskId: number, noteId: number, content: string) => {
    set({ isLoading: true, error: null })
    try {
      await axios.put(`/tasks/${taskId}/notes/${noteId}`, { content })
      set((state) => ({
        currentTask: state.currentTask?.id === taskId
          ? {
              ...state.currentTask,
              notes: state.currentTask.notes.map(note =>
                note.id === noteId ? { ...note, content } : note
              )
            }
          : state.currentTask,
        isLoading: false
      }))
      return true
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update note', isLoading: false })
      return false
    }
  },

  deleteNote: async (taskId: number, noteId: number) => {
    set({ isLoading: true, error: null })
    try {
      await axios.delete(`/tasks/${taskId}/notes/${noteId}`)
      set((state) => ({
        currentTask: state.currentTask?.id === taskId
          ? {
              ...state.currentTask,
              notes: state.currentTask.notes.filter(note => note.id !== noteId)
            }
          : state.currentTask,
        isLoading: false
      }))
      return true
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to delete note', isLoading: false })
      return false
    }
  },

  setCurrentTask: (task: Task | null) => set({ currentTask: task }),
  clearError: () => set({ error: null }),
}))