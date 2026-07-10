import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminPage from "@/components/AdminPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ADMIN_ROLES, ROLE_LABELS, ROLE_PERMISSIONS, type AdminRole } from "@shared/rbac";

export default function AdminTeam() {
  const utils = trpc.useUtils();
  const { data: users } = trpc.adminUsers.list.useQuery();
  const create = trpc.adminUsers.create.useMutation({
    onSuccess: async () => {
      await utils.adminUsers.list.invalidate();
      toast.success("Admin account created");
      setUsername("");
      setPassword("");
    },
    onError: e => toast.error(e.message || "Failed to create account"),
  });
  const setActive = trpc.adminUsers.setActive.useMutation({
    onSuccess: async () => {
      await utils.adminUsers.list.invalidate();
      toast.success("Updated");
    },
    onError: e => toast.error(e.message),
  });
  const resetPw = trpc.adminUsers.resetPassword.useMutation({
    onSuccess: () => toast.success("Password reset"),
    onError: e => toast.error(e.message),
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("operator");

  return (
    <AdminPage active="team">
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6">
        {/* Create */}
        <Card className="p-6">
          <h3 className="heading-md mb-1">Add admin</h3>
          <p className="text-sm text-gray-600 mb-4">
            Each teammate signs in with their own username + password.
          </p>
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              create.mutate({ username, password, role });
            }}
          >
            <div>
              <Label>Username</Label>
              <Input value={username} required minLength={3}
                onChange={e => setUsername(e.target.value)} placeholder="dara" />
            </div>
            <div>
              <Label>Temporary password</Label>
              <Input value={password} required minLength={8} type="text"
                onChange={e => setPassword(e.target.value)} placeholder="min 8 characters" />
            </div>
            <div>
              <Label>Role</Label>
              <select value={role} onChange={e => setRole(e.target.value as AdminRole)}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm">
                {ADMIN_ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {ROLE_PERMISSIONS[role].length} permissions
              </p>
            </div>
            <Button type="submit" disabled={create.isPending} className="w-full btn-primary">
              {create.isPending ? "Creating…" : "Create account"}
            </Button>
          </form>
        </Card>

        {/* List */}
        <Card className="p-6">
          <h3 className="heading-md mb-4">Admin team</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map(u => (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium">{u.username}</td>
                    <td className="py-2 pr-4 text-gray-600">
                      {ROLE_LABELS[u.role as AdminRole] ?? u.role}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        u.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {u.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline"
                          onClick={() => setActive.mutate({ id: u.id, active: !u.active })}>
                          {u.active ? "Disable" : "Enable"}
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => {
                            const pw = window.prompt(`New password for ${u.username} (min 8):`);
                            if (pw && pw.length >= 8) resetPw.mutate({ id: u.id, password: pw });
                            else if (pw) toast.error("Password too short");
                          }}>
                          Reset PW
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users && users.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-500">No admin accounts yet — the master password is Super Admin.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminPage>
  );
}
