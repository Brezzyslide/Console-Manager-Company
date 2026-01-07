import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, ListChecks } from "lucide-react";
import { getCompanyServices, updateCompanyServices, type ServicesUpdateInput } from "@/lib/company-api";

export default function ServicesSettingsPage() {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const { data: services, isLoading } = useQuery({
    queryKey: ["companyServices"],
    queryFn: getCompanyServices,
  });

  useEffect(() => {
    if (services?.categories) {
      const selected = new Set<string>();
      services.categories.forEach(cat => {
        cat.items.forEach(item => {
          if (item.isSelected) {
            selected.add(item.id);
          }
        });
      });
      setSelectedItems(selected);
      setHasChanges(false);
    }
  }, [services]);

  const updateMutation = useMutation({
    mutationFn: updateCompanyServices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyServices"] });
      queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] });
      setHasChanges(false);
    },
  });

  const handleToggle = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
    setHasChanges(true);
  };

  const handleSelectAllCategory = (categoryId: string) => {
    const category = services?.categories.find(c => c.categoryId === categoryId);
    if (!category) return;
    
    const categoryItemIds = category.items.map(item => item.id);
    const allSelected = categoryItemIds.every(id => selectedItems.has(id));
    
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      categoryItemIds.forEach(id => {
        if (allSelected) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
      });
      return newSet;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    const input: ServicesUpdateInput = {
      mode: "CUSTOM",
      selectedLineItemIds: Array.from(selectedItems),
    };
    updateMutation.mutate(input);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Services Settings</h1>
          <p className="text-muted-foreground">
            Configure which NDIS services your organization provides. These services define your compliance scope.
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updateMutation.isPending}
          data-testid="button-save-services"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-6 p-4 bg-muted/50 rounded-lg">
        <ListChecks className="h-5 w-5 text-primary" />
        <span className="font-medium">{selectedItems.size} line items selected</span>
        <span className="text-muted-foreground">across all categories</span>
      </div>

      <div className="space-y-6">
        {services?.categories.map(category => {
          const categoryItemIds = category.items.map(item => item.id);
          const selectedInCategory = categoryItemIds.filter(id => selectedItems.has(id)).length;
          const allSelected = categoryItemIds.every(id => selectedItems.has(id));
          
          return (
            <Card key={category.categoryId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{category.categoryLabel}</CardTitle>
                    <CardDescription>
                      {selectedInCategory} of {category.items.length} items selected
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSelectAllCategory(category.categoryId)}
                    data-testid={`button-select-all-${category.categoryKey}`}
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {category.items.map(item => (
                    <label 
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                      data-testid={`checkbox-item-${item.id}`}
                    >
                      <Checkbox 
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => handleToggle(item.id)}
                      />
                      <span className="font-mono text-xs text-muted-foreground min-w-[60px]">
                        {item.itemCode}
                      </span>
                      <span className="flex-1">{item.itemLabel}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.budgetGroup}
                      </Badge>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasChanges && (
        <div className="fixed bottom-6 right-6">
          <Button 
            size="lg"
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            className="shadow-lg"
            data-testid="button-save-services-floating"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
