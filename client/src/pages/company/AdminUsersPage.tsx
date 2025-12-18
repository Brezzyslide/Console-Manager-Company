import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getCompanyUsers,
  createCompanyUser,
  updateCompanyUser,
  resetUserTempPassword,
  createUserSchema,
  CreateUserInput,
  CompanyUserListItem,
} from "@/lib/company-api";
import {
  Users,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  RefreshCw,
  MoreHorizontal,
  UserPlus,
  KeyRound,
  Shield,
  Mail,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ROLE_OPTIONS = [
  { value: "CompanyAdmin", label: "Company Admin" },
  { value: "Auditor", label: "Auditor" },
  { value: "Reviewer", label: "Reviewer" },
  { value: "StaffReadOnly", label: "Staff (Read Only)" },
];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tempPasswordResult, setTempPasswordResult] = useState<{ email: string; tempPassword: string } | null>(null);
  
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["companyUsers"],
    queryFn: getCompanyUsers,
  });
  
  const createMutation = useMutation({
    mutationFn: createCompanyUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companyUsers"] });
      setShowCreateDialog(false);
      setTempPasswordResult({ email: data.email, tempPassword: data.tempPassword });
      form.reset();
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateCompanyUser>[1] }) =>
      updateCompanyUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyUsers"] });
    },
  });
  
  const resetPasswordMutation = useMutation({
    mutationFn: resetUserTempPassword,
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ["companyUsers"] });
      const user = users?.find(u => u.id === userId);
      if (user) {
        setTempPasswordResult({ email: user.email, tempPassword: data.tempPassword });
      }
    },
  });
  
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      fullName: "",
      role: "StaffReadOnly",
    },
  });
  
  const onSubmit = (data: CreateUserInput) => {
    createMutation.mutate(data);
  };
  
  const handleToggleActive = (user: CompanyUserListItem) => {
    updateMutation.mutate({ id: user.id, updates: { isActive: !user.isActive } });
  };
  
  const handleResetPassword = (userId: string) => {
    resetPasswordMutation.mutate(userId);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage users within your organization
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-user">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>
      
      {tempPasswordResult && (
        <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-800 dark:text-emerald-200">Temporary Password Generated</AlertTitle>
          <AlertDescription className="text-emerald-700 dark:text-emerald-300">
            <p className="mb-2">Share these credentials with <strong>{tempPasswordResult.email}</strong>:</p>
            <div className="flex items-center gap-2 bg-white dark:bg-background p-2 rounded border">
              <code className="flex-1 text-sm font-mono">{tempPasswordResult.tempPassword}</code>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(tempPasswordResult.tempPassword)} data-testid="button-copy-password">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs">This password is shown only once. The user must change it on first login.</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setTempPasswordResult(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Members
          </CardTitle>
          <CardDescription>
            {users?.length || 0} user{(users?.length || 0) !== 1 ? "s" : ""} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.fullName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      <Shield className="h-3 w-3 mr-1" />
                      {ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() => handleToggleActive(user)}
                        disabled={updateMutation.isPending}
                        data-testid={`switch-active-${user.id}`}
                      />
                      <span className={user.isActive ? "text-emerald-600" : "text-muted-foreground"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {user.mustResetPassword && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        <KeyRound className="h-3 w-3 mr-1" />
                        Password reset required
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${user.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleResetPassword(user.id)}
                          disabled={resetPasswordMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(user)}
                          disabled={updateMutation.isPending}
                        >
                          {user.isActive ? "Deactivate User" : "Activate User"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. They will receive a temporary password that must be changed on first login.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {createMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{(createMutation.error as Error).message}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="John Smith"
                  className="pl-10"
                  {...form.register("fullName")}
                  data-testid="input-fullname"
                />
              </div>
              {form.formState.errors.fullName && (
                <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  className="pl-10"
                  {...form.register("email")}
                  data-testid="input-email"
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(value) => form.setValue("role", value as any)}
              >
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.role && (
                <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
              )}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-user">
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
