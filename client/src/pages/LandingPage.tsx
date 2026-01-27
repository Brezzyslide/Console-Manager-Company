import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  Shield, 
  FileCheck, 
  ClipboardList, 
  AlertCircle,
  Users,
  Building2,
  BarChart3,
  Loader2
} from "lucide-react";
import logoImage from "@/assets/logo.png";

async function checkConsoleAuth() {
  const res = await fetch("/api/console/me", { credentials: "include" });
  if (res.ok) return { type: "console" as const, user: await res.json() };
  return null;
}

async function checkCompanyAuth() {
  const res = await fetch("/api/company/me", { credentials: "include" });
  if (res.ok) return { type: "company" as const, user: await res.json() };
  return null;
}

export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    organisation: "",
    email: "",
    phone: "",
    message: "",
  });
  const { toast } = useToast();

  const { data: consoleAuth } = useQuery({
    queryKey: ["consoleAuth"],
    queryFn: checkConsoleAuth,
    retry: false,
  });

  const { data: companyAuth } = useQuery({
    queryKey: ["companyAuth"],
    queryFn: checkCompanyAuth,
    retry: false,
  });

  const isAuthenticated = consoleAuth || companyAuth;
  const dashboardUrl = consoleAuth ? "/console/companies" : "/company/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to send enquiry");
      toast({ title: "Enquiry sent", description: "We'll get back to you soon." });
      setContactOpen(false);
      setFormData({ name: "", organisation: "", email: "", phone: "", message: "" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to send enquiry. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: CheckCircle, text: "Keeps compliance up to date, every day" },
    { icon: FileCheck, text: "Captures evidence as work happens" },
    { icon: ClipboardList, text: "Maintains required registers in one place" },
    { icon: AlertCircle, text: "Surfaces risks and actions early" },
    { icon: Shield, text: "Keeps you audit ready year-round" },
  ];

  const ndisFeatures = [
    { icon: Building2, text: "SIL and site based services" },
    { icon: Users, text: "Participant and site oversight" },
    { icon: BarChart3, text: "Governance and board reporting" },
    { icon: Shield, text: "Aligned with NDIS expectations" },
  ];

  const trustPoints = [
    "Evidence is current",
    "Decisions are traceable",
    "Oversight is visible",
    "Improvement is documented",
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logoImage} alt="Need2Comply AI+" className="h-10" data-testid="logo" />
          <div className="flex items-center gap-3">
            <Link href={isAuthenticated ? dashboardUrl : "/?mode=provider"}>
              <Button data-testid="button-dashboard">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="text-hero-title">
              Always audit ready. Without the scramble.
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Daily compliance and governance for NDIS providers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={isAuthenticated ? dashboardUrl : "/?mode=provider"}>
                <Button size="lg" data-testid="button-hero-dashboard">Go to Dashboard</Button>
              </Link>
              <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" data-testid="button-contact">Contact us</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Contact Us</DialogTitle>
                    <DialogDescription>
                      Tell us about your organisation and we'll be in touch.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organisation">Organisation</Label>
                      <Input
                        id="organisation"
                        required
                        value={formData.organisation}
                        onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                        data-testid="input-contact-organisation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        data-testid="input-contact-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        data-testid="input-contact-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        required
                        rows={3}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        data-testid="input-contact-message"
                      />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setContactOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting} data-testid="button-send-enquiry">
                        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Send enquiry
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-card border-y border-border">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <p className="text-lg text-muted-foreground">
                Audits fail when evidence is late, scattered, or unclear.
              </p>
              <p className="text-lg font-medium text-foreground mt-2">
                Need2Comply AI+ keeps it current, in one place.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="border border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-sm text-foreground leading-relaxed pt-2">{feature.text}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-semibold text-center text-foreground mb-10">Built for NDIS</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {ndisFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="border border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-foreground">{feature.text}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-card border-y border-border">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-semibold text-center text-foreground mb-10">Why auditors trust it</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {trustPoints.map((point, index) => (
                <div key={index} className="text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-foreground">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground mb-6">Compliance, without chaos.</p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              © Needs Technology Pty LTD – 2025 | Richmond AU
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
