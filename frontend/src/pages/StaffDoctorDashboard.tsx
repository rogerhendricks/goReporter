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
import { OverduePatientsCard } from "@/components/dashboard/OverduePatientsCard";
import { IncompleteReportsCard } from "@/components/dashboard/IncompleteReportsCard";
import { UpcomingAppointmentsCard } from "@/components/dashboard/UpcomingAppointmentsCard";
// import { useAuthStore } from "@/stores/authStore";

export default function StaffDoctorDashboard() {
//   const { user } = useAuthStore();

  const actions = [
    {
      title: "All Patients",
      description: "Browse and manage patients across the roster",
      icon: Users,
      href: "/patients",
    },
    {
      title: "Search Patients",
      description: "Find any patient record you need",
      icon: Search,
      href: "/search/patients",
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Staff Doctor Dashboard</h1>
        <p className="text-muted-foreground">
          Complete reports across the roster, manage your own patients, and stay
          ahead of upcoming appointments.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Card key={action.title} className="hover:shadow-lg transition-shadow">
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

      {/* Show all incomplete reports so staff doctors can sign off across patients */}
      <IncompleteReportsCard doctorId={undefined} />

      <UpcomingAppointmentsCard />

      <Card>
        <CardHeader>
          <CardTitle>Staff Doctor Access</CardTitle>
          <CardDescription>
            Your staff doctor account has the following capabilities:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>View and search all patients (permitted by backend access)</li>
            <li>Complete and sign reports across the roster</li>
            <li>Manage reports and tasks for your assigned patients</li>
            <li>Track overdue patients and upcoming appointments</li>
            <li className="text-muted-foreground">
              Administrative settings remain restricted to admins
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
