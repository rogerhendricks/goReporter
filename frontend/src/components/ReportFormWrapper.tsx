import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePatientStore } from '../stores/patientStore';
import { useReportStore } from '../stores/reportStore';
import { ReportForm } from './forms/ReportForm';

export function ReportFormWrapper() {
  const { patientId, reportId } = useParams();
  const { currentPatient, fetchPatient } = usePatientStore();
  const { currentReport, fetchReport } = useReportStore();

  useEffect(() => {
    if (reportId && !patientId) {
      // If we are editing, we might not have patientId in URL, so get it from the report
      if (!currentReport || currentReport.id !== parseInt(reportId)) {
        fetchReport(parseInt(reportId!));
      } else if (currentReport && (!currentPatient || currentPatient.id !== currentReport.patientId)) {
        fetchPatient(currentReport.patientId);
      }
    } else if (patientId) {
      if (!currentPatient || currentPatient.id !== parseInt(patientId)) {
        fetchPatient(parseInt(patientId));
      }
    }
  }, [patientId, reportId, currentPatient, currentReport, fetchPatient, fetchReport]);

  if (!currentPatient) return <div>Loading patient data...</div>;
  
  return <ReportForm patient={currentPatient} />;
}

