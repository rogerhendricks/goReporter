import { useEffect, useState } from "react";
import api from "@/utils/axios";
import { useParams, useNavigate } from "react-router-dom";
import { useReportStore } from "@/stores/reportStore";
import { usePatientStore } from "@/stores/patientStore";
import { useReportPdfHandler } from "@/hooks/useReportPdfHandler";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBreadcrumbs } from "@/components/ui/breadcrumb-context";
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  LinkIcon,
  Mail,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/loading-skeletons";

export default function PatientReportList() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { reports, loading, fetchReportsForPatient, deleteReport } =
    useReportStore();
  const { currentPatient, fetchPatient } = usePatientStore();
  const { viewReportPdf, isProcessing } = useReportPdfHandler();
  const { setItems } = useBreadcrumbs();

  const [emailState, setEmailState] = useState<{
    [reportId: number]: { doctorId?: number; subject: string; body: string };
  }>({});

  const handleViewPdf = (reportId: number) => {
    if (currentPatient) {
      viewReportPdf(reportId, currentPatient);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchReportsForPatient(parseInt(patientId));
      fetchPatient(parseInt(patientId));
    }
  }, [patientId, fetchReportsForPatient, fetchPatient]);

  useEffect(() => {
    const patientLabel = currentPatient
      ? `${currentPatient.fname} ${currentPatient.lname}`
      : "Patient";

    setItems([
      { label: "Home", href: "/" },
      { label: "Patients", href: "/patients" },
      {
        label: patientLabel,
        href: patientId ? `/patients/${patientId}` : "/patients",
      },
      { label: "Reports", current: true },
    ]);
  }, [currentPatient, patientId, setItems]);

  const handleDelete = async (reportId: number) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      await deleteReport(reportId);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.startsWith("0001-01-01")) return "N/A";
    const date = new Date(dateString);
    // Use getUTC methods to ignore the local timezone
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // getUTCMonth is 0-indexed
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const latestImplantedDevice = () => {
    const list = currentPatient?.devices || [];
    if (!list.length) return null;
    return [...list].sort(
      (a, b) =>
        new Date(b.implantedAt).getTime() - new Date(a.implantedAt).getTime(),
    )[0];
  };

  const buildDefaultEmail = (report: any) => {
    const dev = latestImplantedDevice();
    const patientName =
      `${currentPatient?.fname ?? ""} ${currentPatient?.lname ?? ""}`.trim();
    const subj = `${patientName} - Device Report ${formatDate(report.reportDate)}`;
    const bodyLines = [
      "Please find attached the device interrogation report.",
      "",
      `Patient: ${patientName}`,
      `MRN: ${currentPatient?.mrn ?? "N/A"}`,
      "",
      "Device:",
      dev
        ? [
            `- ${dev.device?.manufacturer ?? ""} ${dev.device?.name ?? ""}`,
            `- Model: ${dev.device?.model ?? "N/A"}`,
            `- Serial: ${dev.serial ?? "N/A"}`,
            `- Implanted: ${formatDate(dev.implantedAt)}`,
          ].join("\n")
        : "- No implanted device on file",
      "",
      "Attached: Report PDF",
      "",
      "Regards,",
    ].join("\n");
    return { subject: subj, body: bodyLines };
  };

  const handleDoctorSelect = (report: any, doctorId: number) => {
    setEmailState((prev) => {
      const defaults = buildDefaultEmail(report);
      const existing = prev[report.id] || {};
      return {
        ...prev,
        [report.id]: {
          doctorId,
          subject: existing.subject ?? defaults.subject,
          body: existing.body ?? defaults.body,
        },
      };
    });
  };

  const updateEmailDraft = (
    report: any,
    patch: Partial<{ subject: string; body: string }>,
  ) => {
    setEmailState((prev) => {
      const defaults = buildDefaultEmail(report);
      const existing = prev[report.id] ?? defaults;
      return {
        ...prev,
        [report.id]: {
          doctorId: existing.doctorId,
          subject: patch.subject ?? existing.subject,
          body: patch.body ?? existing.body,
        },
      };
    });
  };

  const handleSendEmail = async (report: any) => {
    const draft = emailState[report.id] ?? buildDefaultEmail(report);
    if (!draft.doctorId) {
      toast.error("Select a doctor first.");
      return;
    }
    try {
      await api.post(`/reports/${report.id}/email`, {
        doctorId: draft.doctorId,
        subject: draft.subject,
        body: draft.body,
        attachPdf: true, // backend should generate/attach the PDF from reportId
      });
      toast.success("Email sent.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send email.");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        {/* <h1 className="text-3xl font-bold">Reports for {currentPatient?.fname} {currentPatient?.lname}</h1> */}

        <Button onClick={() => navigate(`/patients/${patientId}/reports/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Create New Report
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Reports ({reports?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : reports && reports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium text-left">
                      {formatDate(
                        typeof report.reportDate === "string"
                          ? report.reportDate
                          : report.reportDate.toISOString(),
                      )}
                    </TableCell>
                    <TableCell className="text-left">
                      {report.reportType}
                    </TableCell>
                    <TableCell className="text-left">
                      <Badge
                        variant={
                          report.reportStatus === "pending"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {report.reportStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      {report.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {report.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!report.file_url) return;
                            try {
                              // Use axios to fetch the protected file
                              const response = await api.get(report.file_url, {
                                responseType: "blob",
                              });

                              // Create a blob URL from the response
                              const fileBlob = new Blob([response.data], {
                                type:
                                  response.headers["content-type"] ||
                                  "application/pdf",
                              });
                              const url = window.URL.createObjectURL(fileBlob);

                              // Open the blob URL in a new tab
                              window.open(url, "_blank");

                              // Clean up the object URL after a short delay
                              setTimeout(
                                () => window.URL.revokeObjectURL(url),
                                100,
                              );
                            } catch (error) {
                              console.error("Failed to open file:", error);
                              toast.error("Could not open the file.");
                            }
                          }}
                          title="View Uploaded File"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPdf(report.id)}
                        disabled={isProcessing}
                        title="View/Download PDF"
                      >
                        {isProcessing ? (
                          <Download className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </Button>

                      {/* Email Report (HoverCard) */}
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Email Report"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-96 space-y-3">
                          <div>
                            <div className="text-sm font-medium mb-2">
                              Select Doctor
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                              {currentPatient?.patientDoctors?.length ? (
                                currentPatient.patientDoctors.map((pd) => (
                                  <button
                                    key={pd.id}
                                    type="button"
                                    className={`w-full text-left p-2 rounded border hover:bg-accent transition ${
                                      emailState[report.id]?.doctorId ===
                                      pd.doctorId
                                        ? "bg-accent"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      handleDoctorSelect(report, pd.doctorId)
                                    }
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">
                                        {pd.doctor.fullName}
                                      </span>
                                      {pd.isPrimary && (
                                        <Badge variant="default">Primary</Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {pd.doctor.email}
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  No doctors assigned.
                                </div>
                              )}
                            </div>
                          </div>

                          {(() => {
                            const draft =
                              emailState[report.id] ??
                              buildDefaultEmail(report);
                            return (
                              <>
                                <div className="space-y-1">
                                  <Label>Subject</Label>
                                  <Input
                                    value={draft.subject}
                                    onChange={(e) =>
                                      updateEmailDraft(report, {
                                        subject: e.target.value,
                                      })
                                    }
                                    placeholder="Email subject"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label>Body</Label>
                                  <Textarea
                                    rows={6}
                                    value={draft.body}
                                    onChange={(e) =>
                                      updateEmailDraft(report, {
                                        body: e.target.value,
                                      })
                                    }
                                    placeholder="Email body"
                                  />
                                </div>
                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSendEmail(report)}
                                    title="Send Email"
                                  >
                                    <Send className="h-4 w-4 mr-1" /> Send
                                  </Button>
                                </div>
                              </>
                            );
                          })()}
                        </HoverCardContent>
                      </HoverCard>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/reports/${report.id}/edit`)}
                        title="Edit Report"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(report.id)}
                        title="Delete Report"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No reports have been created for this patient.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
