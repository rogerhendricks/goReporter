import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, Activity } from "lucide-react";
import api from "@/utils/axios";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import { Badge } from "@/components/ui/badge";


type RecentReport = {
  id: number;
  reportDate: string | Date;
  reportType?: string | null;
  reportStatus?: string | null;
  patient?: {
    id: number;
    fname?: string | null;
    lname?: string | null;
    mrn?: string | null;
  } | null;
  createdBy?: string | null;
};

type IncompleteReportsCardProps = {
  /**
   * Optional doctor ID to filter reports for a specific doctor.
   * If not provided, shows all incomplete reports (admin view).
   */
  doctorId?: number;
  /**
   * Initial number of reports to load
   */
  initialLimit?: number;
  /**
   * Number of reports to load when clicking "Load More"
   */
  loadMoreLimit?: number;
};

const getReportTypeIcon = (reportType: string) => {
  return reportType === "In Clinic" ? (
    <Calendar className="h-4 w-4" />
  ) : (
    <Activity className="h-4 w-4" />
  );
};

export function IncompleteReportsCard({
  doctorId,
  initialLimit = 10,
  loadMoreLimit = 10,
}: IncompleteReportsCardProps) {
  const [incompleteReports, setIncompleteReports] = useState<RecentReport[]>(
    [],
  );
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadInitialReports();
  }, [doctorId]);

  const loadInitialReports = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: initialLimit,
        incomplete: true,
        offset: 0,
      };
      
      if (doctorId) {
        params.doctorId = doctorId;
      }

      const response = await api.get<RecentReport[]>("/reports/recent", {
        params,
      });
      const reports = response.data || [];
      setIncompleteReports(reports);
      setHasMore(reports.length === initialLimit);
      setOffset(initialLimit);
    } catch (error) {
      console.error("Failed to load incomplete reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const params: any = {
        limit: loadMoreLimit,
        incomplete: true,
        offset,
      };
      
      if (doctorId) {
        params.doctorId = doctorId;
      }

      const response = await api.get<RecentReport[]>("/reports/recent", {
        params,
      });
      const newReports = response.data || [];
      setIncompleteReports((prev) => [...prev, ...newReports]);
      setHasMore(newReports.length === loadMoreLimit);
      setOffset((prev) => prev + loadMoreLimit);
    } catch (error) {
      console.error("Failed to load more incomplete reports:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
            Reports Needing Completion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} columns={6} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
          Reports Needing Completion
        </CardTitle>
      </CardHeader>
      <CardContent>
        {incompleteReports.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">MRN</TableHead>
                <TableHead className="text-left">Patient</TableHead>
                <TableHead className="text-left">Report Date</TableHead>
                <TableHead className="text-left">Report Type</TableHead>
                <TableHead className="text-left">Created By</TableHead>
                <TableHead className="text-left">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incompleteReports.map((r) => {
                const p = r.patient;
                const patientName = p
                  ? [p.lname, p.fname].filter(Boolean).join(", ")
                  : "—";
                const mrn = p?.mrn || "—";
                const createdBy = r.createdBy || "—";
                const reportDateStr = r.reportDate
                  ? new Date(r.reportDate).toLocaleDateString()
                  : "—";

                const patientCell = p?.id ? (
                  <Link
                    to={`/patients/${p.id}`}
                    className="text-primary text-left hover:underline"
                  >
                    {patientName}
                  </Link>
                ) : (
                  patientName
                );

                const reportDateCell = r.id ? (
                  <Link
                    to={`/reports/${r.id}/edit`}
                    className="text-primary text-left hover:underline font-medium"
                  >
                    {reportDateStr}
                  </Link>
                ) : (
                  reportDateStr
                );

                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-left">{mrn}</TableCell>
                    <TableCell className="text-left">{patientCell}</TableCell>
                    <TableCell className="text-left">
                      {reportDateCell}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-1">
                        {getReportTypeIcon(r.reportType || "")}
                        <span>{r.reportType || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-left">{createdBy}</TableCell>
                    <TableCell className="text-left">
                      {/** Render status as a Badge */}
                      {(() => {
                        const status = r.reportStatus || "—";
                        const s = String(status).toLowerCase();
                        if (status === "—") {
                          return <Badge>{status}</Badge>;
                        }
                        if (s.includes("pending")){
                          return <Badge variant="destructive">{status}</Badge>;
                        }
                        if (s.includes("reviewed") || s.includes("complete")) {
                          return <Badge className="bg-purple-700 text-purple-50 dark:bg-purple-300 dark:text-purple-950">{status}</Badge>;
                        }
                        if (s.includes("incomplete")){
                          return <Badge className="bg-green-50 text-green-700 dark:bg-green-300 dark:text-green-950">{status}</Badge>
                        }
                        return <Badge>{status}</Badge>;
                      })()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-sm text-muted-foreground">
            No incomplete reports found.
          </div>
        )}
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
