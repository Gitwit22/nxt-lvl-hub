import { useMemo, useState } from "react";
import { OrgRole, PortalUser, SuiteProgram } from "@/types/orgPortal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";

interface OrgUserTableProps {
  users: PortalUser[];
  programs: SuiteProgram[];
  canManage: boolean;
  onUpdateUser: (userId: string, updates: Partial<PortalUser>) => Promise<void>;
}

const roleOptions: OrgRole[] = ["Super Admin", "Org Admin", "Manager", "Staff"];

export function OrgUserTable({ users, programs, canManage, onUpdateUser }: OrgUserTableProps) {
  const [editingUser, setEditingUser] = useState<PortalUser | null>(null);

  const programsById = useMemo(() => {
    return programs.reduce<Record<string, SuiteProgram>>((acc, program) => {
      acc[program.id] = program;
      return acc;
    }, {});
  }, [programs]);

  const closeDialog = () => setEditingUser(null);

  const toggleProgramAccess = async (programId: string, checked: boolean) => {
    if (!editingUser) return;

    const current = new Set(editingUser.assignedProgramIds);
    if (checked) {
      current.add(programId);
    } else {
      current.delete(programId);
    }

    const assignedProgramIds = Array.from(current);
    try {
      await onUpdateUser(editingUser.id, { assignedProgramIds });
      setEditingUser({ ...editingUser, assignedProgramIds });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Program Access</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    disabled={!canManage}
                    onValueChange={(value) => {
                      void onUpdateUser(user.id, { role: value as OrgRole }).catch((error) => {
                        toast.error(getErrorMessage(error));
                      });
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={user.active}
                      disabled={!canManage}
                      onCheckedChange={(active) => {
                        void onUpdateUser(user.id, { active }).catch((error) => {
                          toast.error(getErrorMessage(error));
                        });
                      }}
                    />
                    <Badge variant={user.active ? "secondary" : "outline"}>{user.active ? "Active" : "Inactive"}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {user.assignedProgramIds.length === 0 && <Badge variant="outline">No programs</Badge>}
                    {user.assignedProgramIds.map((programId) => (
                      <Badge key={programId} variant="secondary">
                        {programsById[programId]?.name ?? "Unknown"}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setEditingUser(user)} disabled={!canManage}>
                    Assign Access
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(editingUser)} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Program Access</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Select which programs {editingUser.name} can access.
              </p>
              <div className="space-y-2 rounded-lg border border-border p-4">
                {programs.map((program) => {
                  const checked = editingUser.assignedProgramIds.includes(program.id);
                  return (
                    <label key={program.id} className="flex items-center gap-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(state) => {
                          void toggleProgramAccess(program.id, Boolean(state));
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium">{program.name}</p>
                        <p className="text-xs text-muted-foreground">{program.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={closeDialog}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
