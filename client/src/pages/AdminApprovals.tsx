import { trpc } from "@/lib/trpc";
import AdminPage from "@/components/AdminPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export default function AdminApprovals() {
  const utils = trpc.useUtils();
  const { data: pending } = trpc.approvals.list.useQuery({ status: "pending" });
  const { data: recent } = trpc.approvals.list.useQuery({});
  const approve = trpc.approvals.approve.useMutation({
    onSuccess: async () => {
      await utils.approvals.list.invalidate();
      await utils.scratch.adminListCampaigns.invalidate();
      toast.success("Approved & applied");
    },
    onError: e => toast.error(e.message || "Failed to approve"),
  });
  const reject = trpc.approvals.reject.useMutation({
    onSuccess: async () => {
      await utils.approvals.list.invalidate();
      toast.success("Rejected");
    },
    onError: e => toast.error(e.message),
  });

  return (
    <AdminPage active="approvals">
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="heading-md mb-4">Pending approvals</h3>
          <div className="space-y-3">
            {(pending ?? []).map(r => (
              <div key={r.id} className="border border-amber-200 bg-amber-50/50 rounded-lg p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{r.summary}</p>
                    <p className="text-xs text-gray-500">
                      Requested by {r.requestedByName || `#${r.requestedBy}`} ·{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={approve.isPending}
                      onClick={() => approve.mutate({ id: r.id })}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        const reason = window.prompt("Reason for rejecting (optional):") ?? "";
                        reject.mutate({ id: r.id, reason: reason || undefined });
                      }}>
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {pending && pending.length === 0 && (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Nothing awaiting approval.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="heading-md mb-4">History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Request</th>
                  <th className="py-2 pr-4">Requested by</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Reviewed by</th>
                </tr>
              </thead>
              <tbody>
                {(recent ?? []).filter(r => r.status !== "pending").map(r => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{r.summary}</td>
                    <td className="py-2 pr-4 text-gray-600">{r.requestedByName || `#${r.requestedBy}`}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        r.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{r.reviewedByName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminPage>
  );
}
