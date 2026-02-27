import { create } from "zustand";
import api from "../utils/axios";

export interface Device {
  ID: number;
  udid: number;
  name: string;
  manufacturer: string;
  model: string;
  type: string;
  polarity: string;
  isMri: boolean;
  hasAlert: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
  DeletedAt?: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DeviceState {
  devices: Device[];
  currentDevice: Device | null;
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;
  fetchDevices: (
    page?: number,
    limit?: number,
    search?: string,
  ) => Promise<void>;
  fetchDevice: (id: number) => Promise<void>;
  createDevice: (data: Omit<Device, "ID">) => Promise<Device | undefined>;
  updateDevice: (
    id: number,
    data: Partial<Device>,
  ) => Promise<Device | undefined>;
  deleteDevice: (id: number) => Promise<void>;
  searchDevices: (query: string) => Promise<void>;
  clearError: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  currentDevice: null,
  pagination: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchDevices: async (page = 1, limit = 25, search = "") => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const response = await api.get(`/devices/all?${params.toString()}`);
      set({
        devices: response.data.data,
        pagination: response.data.pagination,
        loading: false,
      });
    } catch (error: any) {
      console.error("Error fetching devices:", error);
      set({
        error: error.response?.data?.error || "Failed to fetch devices",
        loading: false,
        devices: [],
        pagination: null,
      });
    }
  },

  fetchDevice: async (id: number) => {
    set({ loading: true, error: null, currentDevice: null });
    try {
      const response = await api.get(`/devices/${id}`);

      if (!response.data) {
        throw new Error("Device not found");
      }

      set({ currentDevice: response.data, loading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || "Failed to fetch device",
        loading: false,
      });
    }
  },

  createDevice: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post("/devices", data);
      const newDevice = response.data;
      set((state) => ({
        devices: [newDevice, ...state.devices],
        loading: false,
      }));
      return newDevice;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to create device",
        loading: false,
      });
      throw error;
    }
  },

  updateDevice: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/devices/${id}`, data);
      const updatedDevice = response.data;
      set((state) => ({
        devices: state.devices.map((d) => (d.ID === id ? updatedDevice : d)),
        currentDevice:
          state.currentDevice?.ID === id ? updatedDevice : state.currentDevice,
        loading: false,
      }));
      return updatedDevice;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to update device",
        loading: false,
      });
      throw error;
    }
  },

  deleteDevice: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/devices/${id}`);
      set((state) => ({
        devices: state.devices.filter((d) => d.ID !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to delete device",
        loading: false,
      });
      throw error;
    }
  },

  searchDevices: async (query) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get("/devices/search", {
        params: { search: query },
      });
      set({ devices: response.data, loading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || "No devices found",
        loading: false,
        devices: [],
      });
    }
  },
}));
