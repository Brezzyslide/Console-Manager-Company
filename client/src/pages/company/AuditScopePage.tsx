import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Loader2, Lock, FileStack, CheckCircle2 } from "lucide-react";
import { getAudit, getAuditScopeOptions, updateAuditScope, type LineItemsByCategory } from "@/lib/company-api";

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
    scopeOptions?.lineItemsByCategory.forEach(cat => {
      cat.items.forEach(item => allIds.add(item.lineItemId));
    });
    setSelectedLineItems(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedLineItems(new Set());
  };

  const handleSelectCategory = (categoryItems: { lineItemId: string }[]) => {
    const newSet = new Set(selectedLineItems);
    const allSelected = categoryItems.every(item => selectedLineItems.has(item.lineItemId));
    
    categoryItems.forEach(item => {
      if (allSelected) {
        newSet.delete(item.lineItemId);
      } else {
        newSet.add(item.lineItemId);
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

  const totalItems = scopeOptions?.lineItemsByCategory.reduce(
    (acc, cat) => acc + cat.items.length, 0
  ) || 0;

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
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <Button variant="ghost" className="mb-4" onClick={() => navigate("/audits")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Audits
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{audit?.title}</h1>
        <p className="text-muted-foreground">Select the line items to include in this audit scope</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Line Item Selection</CardTitle>
                  <CardDescription>
                    {selectedLineItems.size} of {totalItems} items selected
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDeselectAll}
                    disabled={selectedLineItems.size === 0}
                    data-testid="button-deselect-all"
                  >
                    Clear
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSelectAll} 
                    data-testid="button-select-all"
                  >
                    Select All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {scopeOptions?.lineItemsByCategory.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No service line items are available. Please configure your company's service selections first.
                </p>
              ) : (
                scopeOptions?.lineItemsByCategory.map(category => {
                  const allSelected = category.items.every(item => selectedLineItems.has(item.lineItemId));
                  const someSelected = category.items.some(item => selectedLineItems.has(item.lineItemId));
                  
                  return (
                    <div key={category.categoryId} className="space-y-3">
                      <div 
                        className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-accent"
                        onClick={() => handleSelectCategory(category.items)}
                      >
                        <Checkbox 
                          checked={allSelected} 
                          className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                          data-testid={`checkbox-category-${category.categoryKey}`}
                        />
                        <div className="flex-1 font-medium">{category.categoryLabel}</div>
                        <Badge variant="outline">{category.items.length} items</Badge>
                      </div>
                      
                      <div className="ml-8 grid gap-1">
                        {category.items.map(item => (
                          <label 
                            key={item.lineItemId}
                            className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                            data-testid={`checkbox-item-${item.lineItemId}`}
                          >
                            <Checkbox 
                              checked={selectedLineItems.has(item.lineItemId)}
                              onCheckedChange={() => handleToggleItem(item.lineItemId)}
                            />
                            <span className="text-sm font-mono text-muted-foreground min-w-[60px]">
                              {item.code}
                            </span>
                            <span className="text-sm flex-1">{item.label}</span>
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

        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileStack className="h-4 w-4" />
                Scope Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Service Context</div>
                <div className="font-medium">
                  {audit?.serviceContextLabel || audit?.serviceContext || "Not set"}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Scope Period</div>
                <div className="font-medium text-sm">
                  {audit?.scopeTimeFrom ? new Date(audit.scopeTimeFrom).toLocaleDateString() : "N/A"} 
                  {" - "}
                  {audit?.scopeTimeTo ? new Date(audit.scopeTimeTo).toLocaleDateString() : "N/A"}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Selected Line Items</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{selectedLineItems.size}</span>
                  <span className="text-muted-foreground">of {totalItems}</span>
                </div>
              </div>

              {selectedLineItems.size > 0 && (
                <div className="pt-3 border-t">
                  <div className="text-sm text-muted-foreground mb-2">Categories with selections</div>
                  <div className="space-y-1">
                    {scopeOptions?.lineItemsByCategory.map(cat => {
                      const selectedCount = cat.items.filter(
                        item => selectedLineItems.has(item.lineItemId)
                      ).length;
                      if (selectedCount === 0) return null;
                      return (
                        <div 
                          key={cat.categoryId} 
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {cat.categoryLabel}
                          </span>
                          <span className="text-muted-foreground">{selectedCount}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
