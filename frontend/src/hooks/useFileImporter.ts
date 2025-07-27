import { useState } from 'react';
import { parseFileContent } from '@/utils/fileParser';
import type { ParsedData } from '@/utils/fileParser';


export function useFileImporter() {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importFile = async (file: File, serial?: string): Promise<ParsedData | null> => {
    setIsImporting(true);
    setError(null);

    try {
      const parsedData = await parseFileContent(file, serial);
      return parsedData;
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