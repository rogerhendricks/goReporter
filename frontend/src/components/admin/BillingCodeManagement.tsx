import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileDown, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { billingService, type BillingCode } from "@/services/billingService";

export const BillingCodeManagement: React.FC = () => {
  const [billingCodes, setBillingCodes] = useState<BillingCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // New category states
  const [newCategory, setNewCategory] = useState("");
  const [newCode, setNewCode] = useState("");

  // Export states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchBillingCodes();
  }, []);

  const fetchBillingCodes = async () => {
    try {
      setIsLoading(true);
      const data = await billingService.getBillingCodes();
      setBillingCodes(data);
    } catch (error) {
      toast.error("Failed to load billing codes.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (category: string, newCode: string) => {
    setBillingCodes((prev) =>
      prev.map((bc) =>
        bc.category === category ? { ...bc, code: newCode } : bc,
      ),
    );
  };

  const handleSave = async (category: string, code: string) => {
    try {
      if (!category.trim()) {
        toast.error("Category name cannot be empty.");
        return;
      }
      setIsSaving(category);
      const savedCode = await billingService.updateBillingCode(category, code);

      // If it's a new code matching what we're saving, we want to clear the inputs
      if (category.toLowerCase() === newCategory.toLowerCase()) {
        setNewCategory("");
        setNewCode("");
        // Update the list if it's a completely new category
        const exists = billingCodes.find(bc => bc.category.toLowerCase() === category.toLowerCase());
        if (!exists) {
          setBillingCodes(prev => [...prev, savedCode].sort((a, b) => a.category.localeCompare(b.category)));
        }
      }

      toast.success(`Billing code for "${category}" updated.`);
    } catch (error) {
      toast.error(`Failed to update billing code for "${category}".`);
    } finally {
      setIsSaving(null);
    }
  };

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    handleSave(newCategory, newCode);
  };

  const handleExport = () => {
    billingService.exportCSV(startDate, endDate);
    toast.success("Your CSV file should download shortly.", {
      description: "Export Started",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing Code Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-4 bg-muted/50 mb-6">
            <h3 className="font-medium flex items-center mb-4">
              <FileDown className="mr-2 h-4 w-4" /> Export Completed Reports
            </h3>
            <div className="flex gap-4 items-end">
              <div className="space-y-1 flex-1 max-w-50]">
                <Label>Start Date (Optional)</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1 flex-1 max-w-50">
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={handleExport} variant="default">
                Export to CSV
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category (Report Type)</TableHead>
                <TableHead>Alphanumeric Code</TableHead>
                <TableHead className="w-25">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingCodes.map((bc) => (
                <TableRow key={bc.category}>
                  <TableCell className="font-medium capitalize">
                    {bc.category}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={bc.code}
                      onChange={(e) =>
                        handleCodeChange(bc.category, e.target.value)
                      }
                      placeholder="e.g. 93294"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleSave(bc.category, bc.code)}
                      disabled={isSaving === bc.category}
                    >
                      {isSaving === bc.category ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {billingCodes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-8"
                  >
                    No billing codes configured. Add one below.
                  </TableCell>
                </TableRow>
              )}
              {/* Add New Row */}
              <TableRow className="bg-muted/30">
                <TableCell>
                  <Input
                    placeholder="New category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Alphanumeric code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={!newCategory.trim() || isSaving === newCategory}
                  >
                    {isSaving === newCategory ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
