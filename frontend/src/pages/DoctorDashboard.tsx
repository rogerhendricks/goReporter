import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Search } from "lucide-react";
import { KeyRound } from "lucide-react";
import { OverduePatientsCard } from "@/components/dashboard/OverduePatientsCard";
import { IncompleteReportsCard } from "@/components/dashboard/IncompleteReportsCard";
import { UpcomingAppointmentsCard } from "@/components/dashboard/UpcomingAppointmentsCard";
import { useAuthStore } from "@/stores/authStore";

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const doctorActions = [
    {
      title: "My Patients",
      description: "View and manage your assigned patients",
      icon: Users,
      href: "/patients",
    },
    {
      title: "Search Patients",
      description: "Search for patients in your care",
      icon: Search,
      href: "/search/patients",
    },
    {
      title: "Request Patient Access",
      description: "Request temporary or permanent access to a patient",
      icon: KeyRound,
      href: "/access-requests/new",
    },
  ];

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
        <p className="text-muted-foreground">
          Access your patients and manage their care. You can view patients
          assigned to you and create reports.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {doctorActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.title}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {action.title}
                </CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={action.href}>Access</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <OverduePatientsCard />

      <IncompleteReportsCard doctorId={user?.ID} />

      <UpcomingAppointmentsCard />

      <Card>
        <CardHeader>
          <CardTitle>Doctor Access</CardTitle>
          <CardDescription>
            Your doctor account has the following capabilities:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>View patients assigned to your care</li>
            <li>Create and edit reports for your patients</li>
            <li>Search through your patient list</li>
            <li>Access patient medical history and data</li>
            <li className="text-muted-foreground">
              Read-only access - cannot modify patient records or system data
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
