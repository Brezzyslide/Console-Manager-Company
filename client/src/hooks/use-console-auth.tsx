import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getConsoleMe, 
  loginConsole, 
  logoutConsole, 
  ConsoleUser 
} from "@/lib/console-api";
import { useLocation } from "wouter";

export function useConsoleAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["console-me"],
    queryFn: getConsoleMe,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      loginConsole(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(["console-me"], user);
      setLocation("/console/companies");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutConsole,
    onSuccess: () => {
      queryClient.setQueryData(["console-me"], null);
      setLocation("/landing");
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    logout: logoutMutation.mutate,
  };
}
