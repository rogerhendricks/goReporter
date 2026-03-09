import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import {
  ProgrammaticReportDocument,
  type PdfSectionVisibility,
} from "@/components/pdf/ProgrammaticReportDocument";
import type { Report } from "@/stores/reportStore";
import type {
  Patient,
  ImplantedDevice,
  ImplantedLead,
} from "@/stores/patientStore";
import type { ClinicalException } from "@/utils/clinicalRulesEngine";

interface PatientDoctor {
  id: number;
  doctorId: number;
  addressId: number;
  isPrimary: boolean;
  doctor: {
    id: number;
    fullName: string;
    email?: string;
    phone?: string;
    specialty?: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
}

export function usePdfFormFiller() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillReportForm = async (
    formData: Partial<Report>,
    patient: Patient,
    activeDevices?: ImplantedDevice[],
    activeLeads?: ImplantedLead[],
    selectedDoctor?: PatientDoctor,
    exceptions?: ClinicalException[],
    visibility?: PdfSectionVisibility,
  ): Promise<Blob | null> => {
    setIsGenerating(true);
    setError(null);

    // Default visibility if none provided
    const defaultVisibility: PdfSectionVisibility = {
      exceptions: true,
      patientInfo: true,
      deviceInfo: true,
      bradySettings: true,
      arrhythmias: true,
      measurements: true,
      comments: true,
      batteryDiagnostics: true,
      tachySettings: true,
      pacingPercentages: true,
      ilrMeasurements: true,
      episodecount: true,
    };

    const currentVisibility = visibility || defaultVisibility;

    console.log("Generating Programmatic PDF:", {
      formData,
      patient,
      activeDevices,
      activeLeads,
      selectedDoctor,
      exceptions,
      currentVisibility,
    });

    try {
      // Create the React element for the PDF document
      const MyDocument = React.createElement(ProgrammaticReportDocument, {
        formData,
        patient,
        activeDevices,
        activeLeads,
        selectedDoctor,
        exceptions,
        visibility: currentVisibility,
        logoDataUri: "/H3.svg", // Assets in public/ are served from root
      });

      // Render the document to a PDF Blob
      const asPdf = pdf(MyDocument as React.ReactElement<any>);
      const blob = await asPdf.toBlob();
      return blob;
    } catch (error) {
      console.error("Error generating PDF form:", error);
      setError("Failed to generate PDF report");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to get available form fields (useful for debugging, keeping for compat)
  const getFormFields = async (): Promise<string[]> => {
    return [];
  };

  return {
    fillReportForm,
    getFormFields,
    isGenerating,
    error,
  };
}
