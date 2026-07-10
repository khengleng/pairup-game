import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminPage from "@/components/AdminPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Status =
  | "pending" | "verification" | "approved" | "fulfilled" | "rejected" | "expired" | "cancelled";

const FILTERS: (Status | "all")[] = ["all", "pending", "approved", "fulfilled", "rejected"];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  verification: "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  fulfilled: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  expired: "bg-gray-100 text-gray-500",
  cancelled: "bg-gray-100 text-gray-500",
};

function money(cents: number | null) {
  return cents == null ? "—" : `$${(cents / 100).toFixed(2)}`;
}

export default function AdminClaims() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Status | "all">("all");
  const { data: claims } = trpc.scratch.adminListClaims.useQuery(
    filter === "all" ? {} : { status: filter }
  );
  const update = trpc.scratch.adminUpdateClaim.useMutation({
    onSuccess: async () => {
      await utils.scratch.adminListClaims.invalidate();
      toast.success("Claim updated");
    },
    onError: e => toast.error(e.message || "Failed to update claim"),
  });

  const act = (id: number, status: Status, ask?: boolean) => {
    let reason: string | undefined;
    if (ask) {
      const r = window.prompt("Reason (optional):") ?? "";
      reason = r || undefined;
    }
    update.mutate({ id, status, reason });
  };

  return (
    <AdminPage active="claims">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="heading-md">Prize Claims</h3>
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                  filter === f ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Claim</th>
                <th className="py-2 pr-4">Player</th>
                <th className="py-2 pr-4">Campaign</th>
                <th className="py-2 pr-4">Prize</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(claims ?? []).map(c => (
                <tr key={c.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{c.claimRef}</td>
                  <td className="py-2 pr-4">{c.playerName || `#${c.userId}`}</td>
                  <td className="py-2 pr-4 text-gray-600">{c.campaignName}</td>
                  <td className="py-2 pr-4">
                    {c.prizeLabel} <span className="text-gray-400">({money(c.valueCents)})</span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[c.status] ?? ""}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-1">
                      {c.status !== "fulfilled" && c.status !== "rejected" && c.status !== "cancelled" && (
                        <>
                          {c.status !== "approved" && (
                            <Button size="sm" variant="outline" disabled={update.isPending}
                              onClick={() => act(c.id, "approved")}>Approve</Button>
                          )}
                          <Button size="sm" disabled={update.isPending}
                            onClick={() => act(c.id, "fulfilled")}>Fulfil</Button>
                          <Button size="sm" variant="outline" disabled={update.isPending}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => act(c.id, "rejected", true)}>Reject</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {claims && claims.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-gray-500 text-center">No claims{filter !== "all" ? ` (${filter})` : ""} yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Fulfil once the voucher/prize has been delivered. Rejecting or cancelling returns the
          prize to inventory.
        </p>
      </Card>
    </AdminPage>
  );
}
