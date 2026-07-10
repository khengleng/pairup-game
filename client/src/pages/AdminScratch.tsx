import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Ticket, ShieldCheck } from "lucide-react";

const STATUS_ACTIONS = ["draft", "active", "paused", "ended"] as const;

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminScratch() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const { data: campaigns } = trpc.scratch.adminListCampaigns.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: audit } = trpc.scratch.adminAuditLog.useQuery(undefined, {
    enabled: isAdmin,
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: detail } = trpc.scratch.adminGetCampaign.useQuery(
    { id: selectedId ?? 0 },
    { enabled: isAdmin && !!selectedId }
  );

  const createCampaign = trpc.scratch.adminCreateCampaign.useMutation({
    onSuccess: async () => {
      await utils.scratch.adminListCampaigns.invalidate();
      toast.success("Campaign created (draft)");
      resetForm();
    },
    onError: e => toast.error(e.message || "Failed to create campaign"),
  });
  const setStatus = trpc.scratch.adminSetStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.scratch.adminListCampaigns.invalidate(),
        utils.scratch.listCampaigns.invalidate(),
      ]);
      toast.success("Status updated");
    },
    onError: e => toast.error(e.message || "Failed to update status"),
  });
  const createTier = trpc.scratch.adminCreatePrizeTier.useMutation({
    onSuccess: async () => {
      await utils.scratch.adminGetCampaign.invalidate();
      toast.success("Prize tier added");
    },
    onError: e => toast.error(e.message || "Failed to add prize tier"),
  });
  const addVouchers = trpc.scratch.adminAddVouchers.useMutation({
    onSuccess: async res => {
      await utils.scratch.adminGetCampaign.invalidate();
      toast.success(`Added ${res.added} voucher codes`);
    },
    onError: e => toast.error(e.message || "Failed to add vouchers"),
  });

  // Create-campaign form state.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [winningCount, setWinningCount] = useState(3);
  const [playerCount, setPlayerCount] = useState(5);
  const [minNumber, setMinNumber] = useState(1);
  const [maxNumber, setMaxNumber] = useState(30);
  const [requiredMatches, setRequiredMatches] = useState(2);
  const [winPercent, setWinPercent] = useState(20);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [expiresAt, setExpiresAt] = useState("");
  const [termsUrl, setTermsUrl] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const submitCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    createCampaign.mutate({
      name,
      description: description || undefined,
      config: { winningCount, playerCount, minNumber, maxNumber, requiredMatches },
      winProbabilityBps: Math.round(winPercent * 100),
      dailyPlayLimit: dailyLimit,
      termsUrl: termsUrl || undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
  };

  // Not signed in → go to admin login (which returns here after sign-in).
  if (!loading && !user) {
    return <Redirect to="/admin/login" />;
  }

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center pairup-gradient">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="heading-md">Access Denied</h2>
          <Button onClick={() => setLocation("/")} className="btn-primary w-full">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Scratch Campaigns</h1>
          </div>
          <Button variant="outline" onClick={() => setLocation("/admin")}>
            Back to Admin
          </Button>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
          {/* Create campaign */}
          <Card className="p-6">
            <h3 className="heading-md mb-1">New Campaign</h3>
            <p className="text-sm text-gray-600 mb-4">
              Matching Winning Numbers. Created as a draft — add prizes, then set
              it Active.
            </p>
            <form onSubmit={submitCampaign} className="space-y-4">
              <div>
                <Label htmlFor="cname">Name</Label>
                <Input id="cname" value={name} required
                  onChange={e => setName(e.target.value)} placeholder="Lunar New Year Lucky Scratch" />
              </div>
              <div>
                <Label htmlFor="cdesc">Description</Label>
                <Textarea id="cdesc" value={description} rows={2}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Scratch to match a winning number and win vouchers!" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Winning #s</Label>
                  <Input type="number" min={1} max={20} value={winningCount}
                    onChange={e => setWinningCount(+e.target.value)} />
                </div>
                <div>
                  <Label>Player #s</Label>
                  <Input type="number" min={1} max={30} value={playerCount}
                    onChange={e => setPlayerCount(+e.target.value)} />
                </div>
                <div>
                  <Label>Match to win</Label>
                  <Input type="number" min={1} max={20} value={requiredMatches}
                    onChange={e => setRequiredMatches(+e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min number</Label>
                  <Input type="number" value={minNumber}
                    onChange={e => setMinNumber(+e.target.value)} />
                </div>
                <div>
                  <Label>Max number</Label>
                  <Input type="number" value={maxNumber}
                    onChange={e => setMaxNumber(+e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Win chance (%)</Label>
                  <Input type="number" min={0} max={100} step="0.1" value={winPercent}
                    onChange={e => setWinPercent(+e.target.value)} />
                </div>
                <div>
                  <Label>Daily limit (0 = ∞)</Label>
                  <Input type="number" min={0} value={dailyLimit}
                    onChange={e => setDailyLimit(+e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Expires</Label>
                  <Input type="date" value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)} />
                </div>
                <div>
                  <Label>Terms URL</Label>
                  <Input value={termsUrl} onChange={e => setTermsUrl(e.target.value)}
                    placeholder="https://…" />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Win chance sets how often the server awards a prize (subject to
                inventory). Prizes and their required matches are added next.
              </p>
              <Button type="submit" disabled={createCampaign.isPending}
                className="w-full btn-primary">
                {createCampaign.isPending ? "Creating…" : "Create draft campaign"}
              </Button>
            </form>
          </Card>

          {/* Campaign list */}
          <Card className="p-6">
            <h3 className="heading-md mb-4">Campaigns</h3>
            <div className="space-y-3">
              {(campaigns ?? []).map(c => (
                <div key={c.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">/{c.slug}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      c.status === "active" ? "bg-green-50 text-green-700"
                        : c.status === "paused" ? "bg-amber-50 text-amber-700"
                        : c.status === "ended" ? "bg-gray-100 text-gray-500"
                        : "bg-purple-50 text-purple-700"}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {STATUS_ACTIONS.filter(s => s !== c.status).map(s => (
                      <Button key={s} type="button" variant="outline" size="sm"
                        disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate({ id: c.id, status: s })}>
                        {s === "active" ? "Activate" : s === "draft" ? "To draft"
                          : s === "paused" ? "Pause" : "End"}
                      </Button>
                    ))}
                    <Button type="button" size="sm"
                      variant={selectedId === c.id ? "default" : "outline"}
                      onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}>
                      {selectedId === c.id ? "Close" : "Manage prizes"}
                    </Button>
                  </div>
                </div>
              ))}
              {campaigns && campaigns.length === 0 && (
                <p className="text-sm text-gray-500">No campaigns yet.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Prize management for selected campaign */}
        {selectedId && detail && (
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="heading-md">{detail.campaign.name} — prizes</h3>
              <div className="text-sm text-gray-600 flex gap-4">
                <span>{detail.plays} plays</span>
                <span>{detail.winners} winners</span>
                <span>Exposure {money(detail.liability.maxExposureCents)}</span>
                <span className="text-green-700">Paid {money(detail.liability.claimedValueCents)}</span>
              </div>
            </div>

            {/* Tier list */}
            <div className="space-y-2">
              {detail.tiers.map(t => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {t.name} · <span className="text-purple-600">{t.valueLabel}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      needs {t.requiredMatches} matches · weight {t.weight} ·{" "}
                      {t.remaining}/{t.totalQty} left · vouchers {t.voucherAvailable}/{t.voucherTotal}
                    </p>
                  </div>
                  <AddVouchers tierId={t.id}
                    onAdd={codes => addVouchers.mutate({ prizeTierId: t.id, codes })}
                    pending={addVouchers.isPending} />
                </div>
              ))}
              {detail.tiers.length === 0 && (
                <p className="text-sm text-gray-500">No prize tiers yet — add one below.</p>
              )}
            </div>

            {(() => {
              const cfg = (typeof detail.campaign.config === "string"
                ? JSON.parse(detail.campaign.config)
                : detail.campaign.config) as {
                winningCount: number;
                playerCount: number;
                requiredMatches: number;
              };
              const minMatches = cfg.requiredMatches;
              const maxMatches = Math.min(cfg.winningCount, cfg.playerCount);
              return (
                <AddTier
                  key={detail.campaign.id}
                  campaignId={detail.campaign.id}
                  minMatches={minMatches}
                  maxMatches={maxMatches}
                  onAdd={input => createTier.mutate(input)}
                  pending={createTier.isPending}
                />
              );
            })()}
          </Card>
        )}

        {/* Audit log */}
        <Card className="p-6">
          <h3 className="heading-md flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            Audit Log
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Actor</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Entity</th>
                </tr>
              </thead>
              <tbody>
                {(audit ?? []).map(a => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">{a.actorRole ?? "—"} #{a.actorId ?? "?"}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{a.action}</td>
                    <td className="py-2 pr-4 text-gray-600">{a.entity} {a.entityId}</td>
                  </tr>
                ))}
                {audit && audit.length === 0 && (
                  <tr><td colSpan={4} className="py-3 text-gray-500">No audit entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AddTier({
  campaignId,
  minMatches,
  maxMatches,
  onAdd,
  pending,
}: {
  campaignId: number;
  minMatches: number;
  maxMatches: number;
  onAdd: (input: {
    campaignId: number;
    name: string;
    valueLabel: string;
    valueCents: number;
    requiredMatches: number;
    totalQty: number;
    weight: number;
  }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [valueLabel, setValueLabel] = useState("");
  const [valueDollars, setValueDollars] = useState(10);
  const [requiredMatches, setRequiredMatches] = useState(minMatches);
  const [totalQty, setTotalQty] = useState(50);
  const [weight, setWeight] = useState(1);
  const matchesOutOfRange =
    requiredMatches < minMatches || requiredMatches > maxMatches;

  return (
    <form
      className="grid sm:grid-cols-6 gap-2 items-end border-t border-gray-100 pt-4"
      onSubmit={e => {
        e.preventDefault();
        onAdd({
          campaignId,
          name,
          valueLabel,
          valueCents: Math.round(valueDollars * 100),
          requiredMatches,
          totalQty,
          weight,
        });
        setName("");
        setValueLabel("");
      }}
    >
      <div className="sm:col-span-2">
        <Label>Tier name</Label>
        <Input value={name} required onChange={e => setName(e.target.value)} placeholder="Bronze" />
      </div>
      <div className="sm:col-span-2">
        <Label>Prize label</Label>
        <Input value={valueLabel} required onChange={e => setValueLabel(e.target.value)} placeholder="$10 voucher" />
      </div>
      <div>
        <Label>Value $</Label>
        <Input type="number" min={0} step="0.01" value={valueDollars} onChange={e => setValueDollars(+e.target.value)} />
      </div>
      <div>
        <Label>Matches</Label>
        <Input
          type="number"
          min={minMatches}
          max={maxMatches}
          value={requiredMatches}
          onChange={e => setRequiredMatches(+e.target.value)}
          className={matchesOutOfRange ? "border-red-400" : ""}
        />
      </div>
      <div>
        <Label>Qty</Label>
        <Input type="number" min={1} value={totalQty} onChange={e => setTotalQty(+e.target.value)} />
      </div>
      <div>
        <Label>Weight</Label>
        <Input type="number" min={1} value={weight} onChange={e => setWeight(+e.target.value)} />
      </div>
      <div className="sm:col-span-6 space-y-2">
        <p className="text-xs text-gray-500">
          Matches to win must be{" "}
          <b>
            {minMatches === maxMatches
              ? minMatches
              : `${minMatches}–${maxMatches}`}
          </b>{" "}
          for this campaign (set by its winning/player number counts). More
          matches = a rarer, higher tier.
        </p>
        <Button type="submit" disabled={pending || matchesOutOfRange} className="btn-primary">
          {pending ? "Adding…" : "Add prize tier"}
        </Button>
      </div>
    </form>
  );
}

function AddVouchers({
  tierId,
  onAdd,
  pending,
}: {
  tierId: number;
  onAdd: (codes: string[]) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Add vouchers
      </Button>
    );
  }
  return (
    <div className="w-full sm:w-auto flex flex-col gap-2">
      <Textarea
        rows={3}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={"One code per line\nSAVE10-ABCD\nSAVE10-EFGH"}
        className="min-w-[220px]"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            const codes = text.split("\n").map(c => c.trim()).filter(Boolean);
            if (codes.length === 0) return;
            onAdd(codes);
            setText("");
            setOpen(false);
          }}
        >
          {pending ? "Adding…" : `Add for tier #${tierId}`}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
