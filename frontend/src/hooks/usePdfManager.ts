import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'

export function usePdfManager() {
  const [files, setFiles] = useState<File[]>([])
  const [isMerging, setIsMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = (newFiles: FileList | null, prepend = false) => {
    if (!newFiles) return
    
    const pdfFiles = Array.from(newFiles).filter(
      (file) => file.type === 'application/pdf'
    )
    
    if (pdfFiles.length !== newFiles.length) {
      setError('Only PDF files are allowed.')
    } else {
      setError(null)
    }

    setFiles((prevFiles) => 
      prepend ? [...pdfFiles, ...prevFiles] : [...prevFiles, ...pdfFiles]
    )
  }

  const removeFile = (indexToRemove: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove))
  }

  const mergePdfs = async (): Promise<Blob | null> => {
    if (files.length === 0) {
      setError('No PDF files selected to merge.')
      return null
    }

    setIsMerging(true)
    setError(null)

    try {
      const mergedPdf = await PDFDocument.create()
      
      for (const file of files) {
        const fileAsArrayBuffer = await file.arrayBuffer()
        const pdfToMerge = await PDFDocument.load(fileAsArrayBuffer)
        const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices())
        copiedPages.forEach((page) => mergedPdf.addPage(page))
      }

      const mergedPdfBytes = await mergedPdf.save()
      return new Blob([mergedPdfBytes], { type: 'application/pdf' })
    } catch (err) {
      console.error('Failed to merge PDFs:', err)
      setError('An error occurred while merging the PDFs.')
      return null
    } finally {
      setIsMerging(false)
    }
  }

  const mergePdfsFromArray = async (filesToMerge: File[]): Promise<Blob | null> => {
    if (filesToMerge.length === 0) return null
    
    setIsMerging(true)
    setError(null)

    try {
      const pdfDoc = await PDFDocument.create()

      for (const file of filesToMerge) {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const copiedPages = await pdfDoc.copyPages(pdf, pdf.getPageIndices())
        copiedPages.forEach((page) => pdfDoc.addPage(page))
      }

      const pdfBytes = await pdfDoc.save()
      return new Blob([pdfBytes], { type: 'application/pdf' })
    } catch (err) {
      console.error('Error merging PDFs:', err)
      setError('Failed to merge PDF files')
      return null
    } finally {
      setIsMerging(false)
    }
  }

  return {
    files,
    addFiles,
    removeFile,
    mergePdfs,
    isMerging,
    error,
    mergePdfsFromArray
  }
}