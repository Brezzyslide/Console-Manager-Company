import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, MessageSquareWarning, ChevronRight, BookOpen } from "lucide-react";

export default function RegistersHomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-[var(--radius)]">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Registers</h1>
        </div>
        <p className="text-muted-foreground">
          Manage compliance and safety registers for your organization.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        <Card className="border border-border hover:border-primary/30 transition-colors" data-testid="card-evacuation-drills">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-[var(--radius)]">
                <Flame className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Evacuation Drill Register</CardTitle>
                <CardDescription>Record and track evacuation drills at your sites</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Document fire drills, bomb threat drills, and other emergency evacuation practices. 
              Use the guided drill workflow to ensure all steps are followed correctly.
            </p>
            <Link href="/registers/evacuation-drills">
              <Button data-testid="button-goto-evacuation-drills">
                Open Register
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-border hover:border-primary/30 transition-colors" data-testid="card-complaints">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-[var(--radius)]">
                <MessageSquareWarning className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Complaints Register</CardTitle>
                <CardDescription>Manage and track complaints and feedback</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Record complaints from participants, families, and staff. Track investigation progress,
              external notifications, and resolution outcomes.
            </p>
            <Link href="/registers/complaints">
              <Button data-testid="button-goto-complaints">
                Open Register
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
