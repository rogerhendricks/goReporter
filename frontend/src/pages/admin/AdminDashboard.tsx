import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>(
    undefined,
  );
  const [tagStats, setTagStats] = useState<TagStats | null>(null);
  const [tagStatsLoading, setTagStatsLoading] = useState(false);
  const [tagStatsError, setTagStatsError] = useState<string>("");



  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [a, t] = await Promise.allSettled([
          api.get<AnalyticsResponse>("/analytics/summary"),
          api.get<Tag[]>("/tags", { params: { type: "patient" } }),
        ]);
        if (!mounted) return;
        if (a.status === "fulfilled") setData(a.value.data);
        if (t.status === "fulfilled") {
          const tagList = t.value.data || [];
          setTags(tagList);
          // Don't auto-select - let user choose
        }
      } finally {
        if (mounted) setLoading(false);
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
              Failed to load analytics.
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
                      <CardTitle>Reports Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 text-sm">
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
