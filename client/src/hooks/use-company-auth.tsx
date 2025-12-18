import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanyMe, companyLogin, companyLogout, CompanyLoginInput, CompanyUser } from "@/lib/company-api";

export function useCompanyAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery<CompanyUser>({
    queryKey: ["companyUser"],
    queryFn: getCompanyMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  
  const loginMutation = useMutation({
    mutationFn: companyLogin,
    onSuccess: (data) => {
      queryClient.setQueryData(["companyUser"], data);
    },
  });
  
  const logoutMutation = useMutation({
    mutationFn: companyLogout,
    onSuccess: () => {
      queryClient.setQueryData(["companyUser"], null);
      queryClient.invalidateQueries({ queryKey: ["companyUser"] });
    },
  });
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    requiresPasswordReset: user?.requiresPasswordReset ?? false,
    login: (input: CompanyLoginInput) => loginMutation.mutateAsync(input),
    logout: () => logoutMutation.mutateAsync(),
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
  };
}
