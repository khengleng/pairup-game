import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Gamepad2, LogOut } from "lucide-react";
import { toast } from "sonner";

type AdminSection =
  | "overview" | "scratch" | "claims" | "fraud" | "reports" | "team" | "approvals";

const TABS: { key: AdminSection; label: string; path: string; perm: string | null }[] = [
  { key: "overview", label: "Overview", path: "/admin", perm: null },
  { key: "scratch", label: "Campaigns", path: "/admin/scratch", perm: "campaigns.view" },
  { key: "approvals", label: "Approvals", path: "/admin/approvals", perm: "approvals.review" },
  { key: "claims", label: "Claims", path: "/admin/claims", perm: "claims.view" },
  { key: "fraud", label: "Fraud", path: "/admin/fraud", perm: "fraud.view" },
  { key: "reports", label: "Reports", path: "/admin/reports", perm: "reports.view" },
  { key: "team", label: "Team", path: "/admin/team", perm: "team.manage" },
];

/** Shared top bar tying the admin sections into one portal. */
export default function AdminNav({ active }: { active: AdminSection }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.adminMe.useQuery();
  const perms = new Set(me?.permissions ?? []);
  const roleLabel = me?.role
    ? me.role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "";
  const visibleTabs = TABS.filter(t => t.perm === null || perms.has(t.perm as any));
  const logout = trpc.auth.adminLogout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Signed out");
      setLocation("/admin/login");
    },
  });

  return (
    <div className="mb-6 rounded-xl bg-white border border-purple-200 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-gray-900">Cambobia Games Admin</p>
            <p className="text-xs text-gray-500">
              {roleLabel ? `Signed in as ${me?.name ?? ""} · ${roleLabel}` : "Manage every game in one place"}
            </p>
          </div>
        </div>
        <button
          onClick={() => logout.mutate()}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
      <nav className="flex gap-1 px-2 pb-2 overflow-x-auto">
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setLocation(tab.path)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              active === tab.key
                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
