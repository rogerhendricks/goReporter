import { useState } from 'react';
import api from '@/utils/axios';
import type { ParsedData } from '@/types/types';

export function useFileImporter() {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importFile = async (file: File): Promise<ParsedData | null> => {
    setIsImporting(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/parser/file", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsImporting(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    importFile,
    isImporting,
    error,
    clearError
  };
}