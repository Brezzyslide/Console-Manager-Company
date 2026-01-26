import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, MessageSquareWarning, ChevronRight, BookOpen, ShieldAlert, TrendingUp, FileEdit, Scale } from "lucide-react";

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
        <Card className="border border-border hover:border-primary/30 transition-colors" data-testid="card-evacuation-drills">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-[var(--radius)]">
                <Flame className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Evacuation Drills</CardTitle>
                <CardDescription>Record and track emergency drills</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Document fire drills and emergency evacuation practices with guided workflow.
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
                <CardTitle className="text-lg">Complaints</CardTitle>
                <CardDescription>Manage complaints and feedback</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Record complaints, track investigations, and resolution outcomes.
            </p>
            <Link href="/registers/complaints">
              <Button data-testid="button-goto-complaints">
                Open Register
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-border hover:border-primary/30 transition-colors" data-testid="card-risks">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-[var(--radius)]">
                <ShieldAlert className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Risk Register</CardTitle>
                <CardDescription>Identify and manage risks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Assess risks using likelihood/consequence matrix and track controls.
            </p>
            <Link href="/registers/risks">
              <Button data-testid="button-goto-risks">
                Open Register
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-border hover:border-primary/30 transition-colors" data-testid="card-improvements">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-[var(--radius)]">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Continuous Improvement</CardTitle>
                <CardDescription>Track improvement initiatives</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Document improvements from incidents, audits, and feedback.
            </p>
            <Link href="/registers/improvements">
              <Button data-testid="button-goto-improvements">
                Open Register
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-border hover:border-primary/30 transition-colors" data-testid="card-policies">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-[var(--radius)]">
                <FileEdit className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Policy Updates</CardTitle>
                <CardDescription>Track policy versions and updates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Record policy changes, approvals, and implementation status.
            </p>
            <Link href="/registers/policies">
              <Button data-testid="button-goto-policies">
                Open Register
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-border hover:border-primary/30 transition-colors" data-testid="card-legislative">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-[var(--radius)]">
                <Scale className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Legislative Register</CardTitle>
                <CardDescription>Track applicable legislation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Pre-populated with NDIS legislation. Track compliance requirements.
            </p>
            <Link href="/registers/legislative">
              <Button data-testid="button-goto-legislative">
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
