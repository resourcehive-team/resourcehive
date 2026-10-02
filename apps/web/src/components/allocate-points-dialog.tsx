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
import { Checkbox } from "@/components/ui/checkbox";
import { allocateSemesterPoints, getRootOrganizationDescendants } from "@/lib/resource-service/organization-api";
import type { Organization } from "@/lib/resource-service/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AllocatePointsDialog({ rootOrganizationId }: { rootOrganizationId: string }) {
  const [open, setOpen] = useState(false);
  const [descendants, setDescendants] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [targetOrganizationIds, setTargetOrganizationIds] = useState<string[]>([rootOrganizationId]);
  const [amount, setAmount] = useState(500);
  const [semesterName, setSemesterName] = useState("Semester-1/2026");

  useEffect(() => {
    if (open && descendants.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      getRootOrganizationDescendants(rootOrganizationId)
        .then(setDescendants)
        .catch(() => toast.error("Failed to load organizations"))
        .finally(() => setLoading(false));
    }
  }, [open, rootOrganizationId, descendants.length]);

  const isDescendantOf = (childId: string, parentId: string) => {
    let currentId = descendants.find(o => o.id === childId)?.parentId;
    while (currentId) {
      if (currentId === parentId) return true;
      currentId = descendants.find(o => o.id === currentId)?.parentId;
    }
    return false;
  };

  const isCoveredByAncestor = (org: Organization) => {
    if (targetOrganizationIds.includes(rootOrganizationId)) return true;
    let currentId = org.parentId;
    while (currentId) {
      if (targetOrganizationIds.includes(currentId)) return true;
      const parentOrg = descendants.find(d => d.id === currentId);
      currentId = parentOrg?.parentId || null;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetOrganizationIds.length === 0) {
      toast.error("Please select at least one target organization");
      return;
    }

    setSubmitting(true);
    try {
      const result = await allocateSemesterPoints(rootOrganizationId, targetOrganizationIds, amount, semesterName);
      toast.success(`Successfully allocated points to ${result.count} members!`);
      setOpen(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to allocate points");
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
          <div className="space-y-3">
            <Label>Target Organizations</Label>
            {loading ? (
              <div className="flex h-10 items-center justify-center rounded-md border text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading organizations...
              </div>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto p-3 border rounded-md">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="all"
                    checked={targetOrganizationIds.includes(rootOrganizationId)}
                    onCheckedChange={(c) => {
                      if (c) setTargetOrganizationIds([rootOrganizationId]);
                      else setTargetOrganizationIds(prev => prev.filter(id => id !== rootOrganizationId));
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="all" className="font-semibold text-primary">
                      Entire University (All members)
                    </Label>
                  </div>
                </div>
                {descendants.map((org) => {
                  const covered = isCoveredByAncestor(org);
                  return (
                    <div key={org.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={org.id}
                        disabled={covered}
                        checked={covered || targetOrganizationIds.includes(org.id)}
                        onCheckedChange={(c) => {
                          if (c) {
                            setTargetOrganizationIds(prev => {
                              if (prev.includes(rootOrganizationId)) return [org.id];
                              const newSelection = prev.filter(id => !isDescendantOf(id, org.id));
                              return [...newSelection, org.id];
                            });
                          } else {
                            setTargetOrganizationIds(prev => prev.filter(id => id !== org.id));
                          }
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor={org.id} className={covered ? "text-muted-foreground" : ""}>
                          {org.name}
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
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
