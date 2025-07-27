import React from 'react'
import { usePdfManager } from '@/hooks/usePdfManager'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'

interface PdfUploaderProps {
  pdfManager: ReturnType<typeof usePdfManager>
}

export function PdfUploader({ pdfManager }: PdfUploaderProps) {
  const { files, addFiles, removeFile, error } = pdfManager
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <Input
        type="file"
        id="pdf-upload"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="application/pdf"
        className="hidden"
      />
      <Button type="button" variant="outline" onClick={handleButtonClick} className="w-full">
        <Upload className="mr-2 h-4 w-4" />
        Attach PDF Files
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Attached Files:</Label>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index}>
                <Badge variant="secondary" className="flex items-center justify-between w-full p-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-normal">{file.name}</span>
                  </div>
                  <button type="button" onClick={() => removeFile(index)} className="ml-2 p-1 rounded-full hover:bg-destructive/20">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}