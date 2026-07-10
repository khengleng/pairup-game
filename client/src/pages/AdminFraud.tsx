import { trpc } from "@/lib/trpc";
import AdminPage from "@/components/AdminPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Smartphone, Globe, Zap, ShieldAlert } from "lucide-react";

export default function AdminFraud() {
  const utils = trpc.useUtils();
  const { data: signals } = trpc.scratch.adminFraudSignals.useQuery();
  const { data: blocked } = trpc.scratch.adminBlockedUsers.useQuery();
  const setBlocked = trpc.scratch.adminSetBlocked.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.scratch.adminFraudSignals.invalidate(),
        utils.scratch.adminBlockedUsers.invalidate(),
      ]);
      toast.success("Updated");
    },
    onError: e => toast.error(e.message || "Failed"),
  });

  const block = (userId: number) => {
    const reason = window.prompt("Block reason:") ?? "";
    setBlocked.mutate({ userId, blocked: true, reason: reason || undefined });
  };

  return (
    <AdminPage active="fraud">
      <div className="space-y-6">
        {/* Shared devices */}
        <Card className="p-6">
          <h3 className="heading-md flex items-center gap-2 mb-1">
            <Smartphone className="w-5 h-5 text-purple-600" />
            Devices shared by multiple accounts
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            One device playing on several accounts is the classic way to farm limited prize
            inventory.
          </p>
          <div className="space-y-2">
            {(signals?.sharedDevices ?? []).map(d => (
              <div key={d.deviceHash} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-gray-500">device {d.deviceHash}…</p>
                  <span className="text-xs font-semibold text-red-600">
                    {d.accounts} accounts · {d.plays} plays
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {d.members.map(m => (
                    <div key={m.userId} className="flex items-center gap-1 text-xs bg-gray-50 rounded px-2 py-1">
                      <span>{m.name || `#${m.userId}`}</span>
                      {m.userId != null && (
                        <button className="text-red-600 underline" disabled={setBlocked.isPending}
                          onClick={() => block(m.userId!)}>block</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {signals && signals.sharedDevices.length === 0 && (
              <p className="text-sm text-gray-500">No shared devices flagged. 👍</p>
            )}
          </div>
        </Card>

        {/* Shared IPs + velocity */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="heading-md flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-purple-600" />
              Shared IPs
            </h3>
            <div className="space-y-1">
              {(signals?.sharedIps ?? []).map(ip => (
                <div key={ip.ip} className="flex items-center justify-between text-sm rounded bg-gray-50 px-3 py-2">
                  <span className="font-mono">{ip.ip}</span>
                  <span className="text-gray-500">{ip.accounts} accts · {ip.plays} plays</span>
                </div>
              ))}
              {signals && signals.sharedIps.length === 0 && (
                <p className="text-sm text-gray-500">None flagged.</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="heading-md flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-purple-600" />
              High velocity (last hour)
            </h3>
            <div className="space-y-1">
              {(signals?.highVelocity ?? []).map(v => (
                <div key={v.userId} className="flex items-center justify-between text-sm rounded bg-gray-50 px-3 py-2">
                  <span>{v.name || `#${v.userId}`}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-red-600 font-semibold">{v.plays} plays</span>
                    {!v.blocked && v.userId != null && (
                      <button className="text-red-600 underline text-xs" disabled={setBlocked.isPending}
                        onClick={() => block(v.userId!)}>block</button>
                    )}
                  </span>
                </div>
              ))}
              {signals && signals.highVelocity.length === 0 && (
                <p className="text-sm text-gray-500">No bot-like activity.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Blocked users */}
        <Card className="p-6">
          <h3 className="heading-md flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Blocked players
          </h3>
          <div className="space-y-1">
            {(blocked ?? []).map(u => (
              <div key={u.id} className="flex items-center justify-between text-sm rounded bg-red-50 px-3 py-2">
                <span>
                  {u.name || `#${u.id}`}
                  {u.blockReason && <span className="text-gray-500"> · {u.blockReason}</span>}
                </span>
                <Button size="sm" variant="outline" disabled={setBlocked.isPending}
                  onClick={() => setBlocked.mutate({ userId: u.id, blocked: false })}>
                  Unblock
                </Button>
              </div>
            ))}
            {blocked && blocked.length === 0 && (
              <p className="text-sm text-gray-500">No blocked players.</p>
            )}
          </div>
        </Card>
      </div>
    </AdminPage>
  );
}
