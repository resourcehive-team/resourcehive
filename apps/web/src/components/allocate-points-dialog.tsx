"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allocateSemesterPoints, getRootOrganizationDescendants } from "@/lib/resource-service/organization-api";
import type { Organization } from "@/lib/resource-service/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AllocatePointsDialog({ rootOrganizationId }: { rootOrganizationId: string }) {
  const [open, setOpen] = useState(false);
  const [descendants, setDescendants] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [targetOrganizationId, setTargetOrganizationId] = useState(rootOrganizationId);
  const [amount, setAmount] = useState(500);
  const [semesterName, setSemesterName] = useState("Semester-1/2026");

  useEffect(() => {
    if (open && descendants.length === 0) {
      setLoading(true);
      getRootOrganizationDescendants(rootOrganizationId)
        .then(setDescendants)
        .catch(() => toast.error("Failed to load organizations"))
        .finally(() => setLoading(false));
    }
  }, [open, rootOrganizationId, descendants.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrganizationId) {
      toast.error("Please select a target organization");
      return;
    }

    setSubmitting(true);
    try {
      const result = await allocateSemesterPoints(rootOrganizationId, targetOrganizationId, amount, semesterName);
      toast.success(`Successfully allocated points to ${result.count} members!`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to allocate points");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Allocate Semester Points</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocate Semester Points</DialogTitle>
          <DialogDescription>
            Distribute points to a child organization and all of its descendants.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="targetOrg">Target Organization</Label>
            {loading ? (
              <div className="flex h-10 items-center justify-center rounded-md border text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading organizations...
              </div>
            ) : (
              <Select value={targetOrganizationId} onValueChange={setTargetOrganizationId}>
                <SelectTrigger id="targetOrg">
                  <SelectValue placeholder="Select an organization">
                    {targetOrganizationId === rootOrganizationId
                      ? "Entire University (All members)"
                      : descendants.find(org => org.id === targetOrganizationId)?.name || "Select an organization"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={rootOrganizationId} className="font-semibold text-primary">
                    Entire University (All members)
                  </SelectItem>
                  {descendants.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="semesterName">Semester Name</Label>
            <Input
              id="semesterName"
              value={semesterName}
              onChange={(e) => setSemesterName(e.target.value)}
              placeholder="Semester-1/2026"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (Points)</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loading}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Allocate Points
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
