import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

import api from "@/utils/axios";
import { DonutChart } from "@/components/charts/DonutChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "react-router-dom";
import { CheckSquare } from "lucide-react";
import { TaskList } from "@/components/tasks/TaskList";
import {
  DonutChartSkeleton,
  TableSkeleton,
} from "@/components/ui/loading-skeletons";
import { IncompleteReportsCard } from "@/components/dashboard/IncompleteReportsCard";

type Slice = { label: string; count: number };
type ReportSummary = {
  total: number;
  incomplete: number;
  byStatus: Slice[];
};
type AnalyticsResponse = {
  byManufacturer: Slice[];
  byDeviceType: Slice[];
  reports: ReportSummary;
};

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

export default function Home() {
  const { user } = useAuthStore();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);

  // Redirect based on user role
  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  } else if (user?.role === "doctor") {
    return <Navigate to="/doctor" replace />;
  } else if (user?.role === "viewer") {
    return <Navigate to="/viewer-dashboard" replace />;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [a, r] = await Promise.allSettled([
          api.get<AnalyticsResponse>("/analytics/summary"),
          api.get<RecentReport[]>("/reports/recent", { params: { limit: 10 } }),
        ]);
        if (!mounted) return;
        if (a.status === "fulfilled") setData(a.value.data);
        if (r.status === "fulfilled") setRecentReports(r.value.data || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // useEffect(() => {
  //   let mounted = true
  //   ;(async () => {
  //     try {
  //       const res = await api.get<AnalyticsResponse>('/analytics/summary')
  //       if (mounted) setData(res.data)
  //     } finally {
  //       if (mounted) setLoading(false)
  //     }
  //   })()
  //   return () => { mounted = false }
  // }, [])

  // const handleLogout = async () => {
  //   await logout()
  //   navigate('/login', { replace: true })
  // }

  if (loading) {
    return (
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DonutChartSkeleton />
          <DonutChartSkeleton />
        </div>
        <div className="mt-6">
          <TableSkeleton rows={10} columns={6} />
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load analytics.
      </div>
    );
  }
  return (
    <div className="container mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="md:mb-6">
          <DonutChart
            title="Implants by Manufacturer"
            slices={data.byManufacturer}
          />
        </div>
        <div className="md:mb-6">
          <DonutChart
            title="Implants by Device Type"
            slices={data.byDeviceType}
          />
        </div>
        <div className="flex items-center justify-between">
          <Card>
            <CardHeader>
              <CardTitle>Reports Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-sm">
                <span className="font-medium">Total:</span> {data.reports.total}{" "}
                <span className="ml-4 font-medium">Waiting to complete:</span>{" "}
                {data.reports.incomplete}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Status</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.reports.byStatus ?? []).map((s) => (
                    <TableRow key={s.label || "Unknown"}>
                      <TableCell className="text-left">
                        {s.label || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">{s.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="mt-6">
        <IncompleteReportsCard />
      </div>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              My Assigned Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Pass the current user's ID to filter tasks */}
            <TaskList assignedToId={Number(user?.ID ?? 0)} showFilters={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
