import { useCompanyAuth } from "@/hooks/use-company-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Users, ClipboardList, Calendar } from "lucide-react";

export default function DashboardPage() {
  const { user } = useCompanyAuth();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user?.fullName}
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overview</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Provider Portal</div>
            <p className="text-xs text-muted-foreground">
              Your NDIS provider management hub
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.role}</div>
            <p className="text-xs text-muted-foreground">
              Current access level
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Coming Soon</div>
            <p className="text-xs text-muted-foreground">
              Service delivery tracking
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Schedule</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Coming Soon</div>
            <p className="text-xs text-muted-foreground">
              Appointment management
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Welcome to your NDIS provider portal. More features will be available in upcoming sprints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {user?.role === "CompanyAdmin" 
              ? "As a Company Admin, you can manage users in your organization via the User Management section."
              : "Contact your Company Admin if you need any account changes."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
