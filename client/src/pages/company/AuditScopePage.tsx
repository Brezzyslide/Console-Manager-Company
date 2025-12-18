import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Loader2, Lock } from "lucide-react";
import { getAudit, getAuditScopeOptions, updateAuditScope } from "@/lib/company-api";

export default function AuditScopePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedLineItems, setSelectedLineItems] = useState<Set<string>>(new Set());

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["audit", id],
    queryFn: () => getAudit(id!),
    enabled: !!id,
  });

  const { data: scopeOptions, isLoading: optionsLoading } = useQuery({
    queryKey: ["auditScopeOptions", id],
    queryFn: () => getAuditScopeOptions(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (audit?.scopeLineItems) {
      setSelectedLineItems(new Set(audit.scopeLineItems.map((s: any) => s.lineItemId)));
    }
  }, [audit]);

  const saveMutation = useMutation({
    mutationFn: () => updateAuditScope(id!, Array.from(selectedLineItems)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
      navigate(`/audits/${id}/template`);
    },
  });

  const handleSelectAll = () => {
    const allIds = new Set<string>();
    scopeOptions?.categories.forEach(cat => {
      cat.lineItems.forEach(item => allIds.add(item.id));
    });
    setSelectedLineItems(allIds);
  };

  const handleSelectCategory = (categoryItems: { id: string }[]) => {
    const newSet = new Set(selectedLineItems);
    const allSelected = categoryItems.every(item => selectedLineItems.has(item.id));
    
    categoryItems.forEach(item => {
      if (allSelected) {
        newSet.delete(item.id);
      } else {
        newSet.add(item.id);
      }
    });
    
    setSelectedLineItems(newSet);
  };

  const handleToggleItem = (itemId: string) => {
    const newSet = new Set(selectedLineItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedLineItems(newSet);
  };

  const isLoading = auditLoading || optionsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (audit?.scopeLocked) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Scope is Locked</h2>
            <p className="text-muted-foreground mb-4">This audit's scope cannot be modified after starting</p>
            <Button onClick={() => navigate(`/audits/${id}/run`)}>
              Continue to Audit Runner
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button variant="ghost" className="mb-4" onClick={() => navigate("/audits")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Audits
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{audit?.title}</h1>
        <p className="text-muted-foreground">Select the line items to include in this audit scope</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Line Item Selection</CardTitle>
              <CardDescription>
                {selectedLineItems.size} of {scopeOptions?.categories.reduce((acc, cat) => acc + cat.lineItems.length, 0) || 0} items selected
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleSelectAll} data-testid="button-select-all">
              Select All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {scopeOptions?.categories.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No service line items are available. Please configure your company's service selections first.
            </p>
          ) : (
            scopeOptions?.categories.map(category => {
              const allSelected = category.lineItems.every(item => selectedLineItems.has(item.id));
              const someSelected = category.lineItems.some(item => selectedLineItems.has(item.id));
              
              return (
                <div key={category.category.id} className="space-y-3">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => handleSelectCategory(category.lineItems)}
                  >
                    <Checkbox 
                      checked={allSelected} 
                      className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                      data-testid={`checkbox-category-${category.category.categoryKey}`}
                    />
                    <div className="font-medium">{category.category.categoryLabel}</div>
                    <Badge variant="outline">{category.lineItems.length} items</Badge>
                  </div>
                  
                  <div className="ml-8 grid gap-2">
                    {category.lineItems.map(item => (
                      <label 
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                        data-testid={`checkbox-item-${item.id}`}
                      >
                        <Checkbox 
                          checked={selectedLineItems.has(item.id)}
                          onCheckedChange={() => handleToggleItem(item.id)}
                        />
                        <span className="text-sm font-mono text-muted-foreground">{item.itemCode}</span>
                        <span className="text-sm">{item.itemLabel}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {saveMutation.error && (
        <p className="text-sm text-destructive mb-4">{(saveMutation.error as Error).message}</p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate("/audits")}>
          Cancel
        </Button>
        <Button 
          onClick={() => saveMutation.mutate()} 
          disabled={selectedLineItems.size === 0 || saveMutation.isPending}
          data-testid="button-save-scope"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save & Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
