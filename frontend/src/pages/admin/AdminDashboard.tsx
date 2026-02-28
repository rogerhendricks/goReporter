import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare } from "lucide-react";

import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { TagManagement } from "@/components/admin/TagManagement";
import { TaskTemplateManager } from "@/components/admin/TaskTemplateManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import api from "@/utils/axios";
import { DonutChart } from "@/components/charts/DonutChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskList } from "@/components/tasks/TaskList";
import { SecurityLogsDashboard } from "@/components/admin/SecurityLogManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DonutChartSkeleton,
  TableSkeleton,
} from "@/components/ui/loading-skeletons";
import { ReportBuilder } from "@/components/report-builder/ReportBuilder";
import { WebhookManagement } from "@/components/admin/WebhookManagement";
import { TeamManagement } from "@/components/admin/TeamManagement";
import { OverduePatientsCard } from "@/components/dashboard/OverduePatientsCard";
import { IncompleteReportsCard } from "@/components/dashboard/IncompleteReportsCard";
import { AccessRequestsCard } from "@/components/admin/AccessRequestsCard";
import { MissedAppointments } from "@/components/admin/MissedAppointments";
import { BillingCodeManagement } from "@/components/admin/BillingCodeManagement";

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

type Tag = {
  ID: number;
  name: string;
  color?: string;
  description?: string;
};

type TagStats = {
  tagId: number;
  tagName: string;
  totalPatients: number;
  patientsWithTag: number;
  patientsWithoutTag: number;
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string>("");
  const [reportYear, setReportYear] = useState<number>(() => {
    const year = new Date().getFullYear();
    return Math.min(2035, Math.max(2025, year));
  });
  const [reportMonth, setReportMonth] = useState<number>(
    () => new Date().getMonth() + 1,
  );
  const [pendingReportYear, setPendingReportYear] = useState<number>(() => {
    const year = new Date().getFullYear();
    return Math.min(2035, Math.max(2025, year));
  });
  const [pendingReportMonth, setPendingReportMonth] = useState<number>(
    () => new Date().getMonth() + 1,
  );

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>(
    undefined,
  );
  const [tagStats, setTagStats] = useState<TagStats | null>(null);
  const [tagStatsLoading, setTagStatsLoading] = useState(false);
  const [tagStatsError, setTagStatsError] = useState<string>("");

  const reportYears = Array.from({ length: 11 }, (_, i) => 2025 + i);
  const reportMonths = [
    { value: 1, label: "Jan" },
    { value: 2, label: "Feb" },
    { value: 3, label: "Mar" },
    { value: 4, label: "Apr" },
    { value: 5, label: "May" },
    { value: 6, label: "Jun" },
    { value: 7, label: "Jul" },
    { value: 8, label: "Aug" },
    { value: 9, label: "Sep" },
    { value: 10, label: "Oct" },
    { value: 11, label: "Nov" },
    { value: 12, label: "Dec" },
  ];

  const getReportDateRange = (year: number, month: number) => {
    if (!year || month < 1 || month > 12) return null;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const toYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    return { start: toYmd(startDate), end: toYmd(endDate) };
  };

  const handleApplyReportMonth = async () => {
    const range = getReportDateRange(pendingReportYear, pendingReportMonth);
    if (!range) {
      setAnalyticsError("Please select a valid year and month.");
      return;
    }
    setAnalyticsLoading(true);
    setAnalyticsError("");
    try {
      const response = await api.get<ReportSummary>(
        "/analytics/reports-summary",
        {
          params: range ?? undefined,
        },
      );
      setData((prev) =>
        prev
          ? { ...prev, reports: response.data }
          : { byManufacturer: [], byDeviceType: [], reports: response.data },
      );
      setReportYear(pendingReportYear);
      setReportMonth(pendingReportMonth);
    } catch (error: any) {
      setAnalyticsError(
        error?.response?.data?.error || "Failed to load report summary.",
      );
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setAnalyticsError("");
      try {
        const range = getReportDateRange(reportYear, reportMonth);
        const response = await api.get<AnalyticsResponse>(
          "/analytics/summary",
          {
            params: range ?? undefined,
          },
        );
        if (!mounted) return;
        setData(response.data);
      } catch (error: any) {
        if (!mounted) return;
        setData(null);
        setAnalyticsError(
          error?.response?.data?.error || "Failed to load analytics.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await api.get<Tag[]>("/tags", {
          params: { type: "patient" },
        });
        if (!mounted) return;
        const tagList = response.data || [];
        setTags(tagList);
        // Don't auto-select - let user choose
      } catch {
        // Intentionally no-op; tag list is optional for analytics
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch tag statistics when selectedTagId changes
  useEffect(() => {
    // Only fetch if we have a valid tag ID
    if (!selectedTagId) {
      setTagStats(null);
      return;
    }
    let mounted = true;
    (async () => {
      setTagStatsLoading(true);
      setTagStatsError("");
      try {
        const response = await api.get<TagStats>("/tags/stats", {
          params: { tagId: selectedTagId },
        });
        if (mounted) {
          setTagStats(response.data);
        }
      } catch (error: any) {
        if (mounted) {
          setTagStatsError(
            error?.response?.data?.error || "Failed to load tag statistics",
          );
        }
      } finally {
        if (mounted) setTagStatsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedTagId]);

  return (
    <div className="container mx-auto">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">My Overview</TabsTrigger>
          <TabsTrigger value="admin">Admin Tools</TabsTrigger>
          <TabsTrigger value="management">User Management</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="security-logs">Security Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DonutChartSkeleton />
                <DonutChartSkeleton />
                <DonutChartSkeleton />
                <DonutChartSkeleton />
                <DonutChartSkeleton />
              </div>
              <TableSkeleton rows={10} columns={6} />
            </>
          ) : !data ? (
            <div className="p-4 text-sm text-destructive">
              {analyticsError || "Failed to load analytics."}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
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
                <div className="md:mb-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Patient Tag Distribution
                      </CardTitle>
                      <CardDescription className="text-xs">
                        View how many patients have a specific tag
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {tags.length > 0 ? (
                        <Select
                          value={selectedTagId}
                          onValueChange={(value) => {
                            if (value && value !== "undefined") {
                              setSelectedTagId(value);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full mb-2">
                            <SelectValue placeholder="Select a tag to analyze" />
                          </SelectTrigger>
                          <SelectContent>
                            {tags.map((tag) => {
                              const tagValue = String(tag.ID);
                              return (
                                <SelectItem key={tag.ID} value={tagValue}>
                                  {tag.name}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-xs text-muted-foreground mt-2">
                          No tags available
                        </div>
                      )}
                      {tagStatsLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="h-48 w-48 rounded-full bg-accent animate-pulse" />
                        </div>
                      ) : tagStatsError ? (
                        <div className="text-sm text-destructive">
                          {tagStatsError}
                        </div>
                      ) : tagStats && selectedTagId ? (
                        <DonutChart
                          title=""
                          slices={[
                            {
                              label: `With ${tagStats.tagName}`,
                              count: tagStats.patientsWithTag,
                            },
                            {
                              label: `Without ${tagStats.tagName}`,
                              count: tagStats.patientsWithoutTag,
                            },
                          ]}
                          legendPosition="top"
                          showCounts={true}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Select a tag to view statistics
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <div className="md:mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Reports Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline">
                            {reportYear}-{String(reportMonth).padStart(2, "0")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">
                              Year
                            </span>
                            <Select
                              value={String(pendingReportYear)}
                              onValueChange={(value) =>
                                setPendingReportYear(Number(value))
                              }
                            >
                              <SelectTrigger className="h-8 w-30">
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                              <SelectContent>
                                {reportYears.map((year) => (
                                  <SelectItem key={year} value={String(year)}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs text-muted-foreground">
                              Month
                            </span>
                            <Select
                              value={String(pendingReportMonth)}
                              onValueChange={(value) =>
                                setPendingReportMonth(Number(value))
                              }
                            >
                              <SelectTrigger className="h-8 w-30">
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                              <SelectContent>
                                {reportMonths.map((month) => (
                                  <SelectItem
                                    key={month.value}
                                    value={String(month.value)}
                                  >
                                    {month.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={handleApplyReportMonth}
                              disabled={
                                analyticsLoading ||
                                (pendingReportYear === reportYear &&
                                  pendingReportMonth === reportMonth)
                              }
                            >
                              {analyticsLoading ? "Loading..." : "Apply"}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      {analyticsError ? (
                        <div className="mb-2 text-xs text-destructive">
                          {analyticsError}
                        </div>
                      ) : null}
                      <div className="my-4 text-sm">
                        <span className="font-medium">Total:</span>{" "}
                        {data.reports.total}{" "}
                        <span className="ml-4 font-medium">
                          Waiting to complete:
                        </span>{" "}
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
                              <TableCell className="text-right">
                                {s.count}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <IncompleteReportsCard />

              <OverduePatientsCard />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    My Assigned Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskList
                    assignedToId={Number(user?.ID ?? 0)}
                    showFilters={true}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="admin" className="space-y-6">
          <MissedAppointments />
          <AccessRequestsCard />
          <TagManagement />
          <TaskTemplateManager />
          <BillingCodeManagement />
        </TabsContent>
        <TabsContent value="management" className="space-y-6">
          <TeamManagement />
          <UserManagementTable />
        </TabsContent>
        <TabsContent value="reports" className="space-y-6">
          <ReportBuilder />
        </TabsContent>
        <TabsContent value="webhooks" className="space-y-6">
          <WebhookManagement />
        </TabsContent>
        <TabsContent value="security-logs" className="space-y-6">
          <SecurityLogsDashboard />
        </TabsContent>
      </Tabs>
      <Card className="hover:shadow-lg transition-shadow mt-4">
        <CardHeader>
          <CardTitle>Admin Privileges</CardTitle>
          <CardDescription>
            Your admin account has the following capabilities:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-left">
            <li>Create, update and delete all patient records</li>
            <li>Manage doctor accounts and assignments</li>
            <li>Configure medical devices and leads</li>
            <li>Access all reports and data across the system</li>
            <li>Manage system users and their roles</li>
            <li>Create, update and delete tags for categorization</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
