import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
import { useFileImporter } from '@/hooks/useFileImporter';
import type { ParsedData } from '@/utils/fileParser';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FileImporterProps {
  onDataImported: (data: ParsedData, file: File) => void;
}

export function FileImporter({ onDataImported }: FileImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importFile, isImporting, clearError } = useFileImporter();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearError();

    // Validate file type
    const allowedExtensions = ['.xml', '.log', '.bnk', '.pdf'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Please select a valid file (.xml, .log, .bnk, or .pdf)');
      return;
    }

    try {
      const parsedData = await importFile(file);
      if (parsedData) {
        onDataImported(parsedData, file);
        console.log('Imported data:', parsedData);
        toast.success(`Successfully imported data from ${file.name}`);
        
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      toast.error('Failed to import file data');
    }
  };

  const openFileDialog = () => fileInputRef.current?.click();

  return (
    // <Card>
    //   <CardHeader>
    //     <CardTitle className="flex items-center gap-2">
    //       <FileText className="h-5 w-5" />
    //       Import Device Data
    //     </CardTitle>
    //     <CardDescription>
    //       Import data from device files (.xml, .log, .bnk) to automatically populate form fields
    //     </CardDescription>
    //   </CardHeader>
    //   <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={openFileDialog}
            disabled={isImporting}
            className="flex items-center gap-2"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isImporting ? 'Importing...' : 'Select File'}
          </Button>
          
          {/* <div className="text-sm text-muted-foreground">
            Supported formats: XML, LOG, BNK
          </div> */}
        <Input
          ref={fileInputRef}
          type="file"
          accept=".xml,.log,.bnk, .pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
         <span className="text-sm text-muted-foreground">Supported: XML, LOG, BNK, PDF</span>
      </div>
        // {error && (
        //   <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
        //     <AlertCircle className="h-4 w-4" />
        //     <span className="text-sm">{error}</span>
        //   </div>
        // )}
    //   </CardContent>
    // </Card>
  );
}

