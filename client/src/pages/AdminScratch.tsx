import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AdminNav from "@/components/AdminNav";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import type { ScratchGameType, PatternId } from "@shared/scratch/types";

const STATUS_ACTIONS = ["draft", "active", "paused", "ended"] as const;

const GAME_TYPE_LABELS: Record<ScratchGameType, string> = {
  matching_numbers: "Matching Winning Numbers",
  matching_symbols: "Matching Symbols",
  matching_amounts: "Matching Prize Amounts",
  pattern: "Pattern Completion",
};

const PATTERN_OPTIONS: { id: PatternId; label: string }[] = [
  { id: "row", label: "Row" },
  { id: "col", label: "Column" },
  { id: "diag", label: "Diagonal" },
  { id: "x", label: "X (both diagonals)" },
  { id: "corners", label: "Four corners" },
];

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
  const updateCampaign = trpc.scratch.adminUpdateCampaign.useMutation({
    onSuccess: async () => {
      await utils.scratch.adminListCampaigns.invalidate();
      await utils.scratch.adminGetCampaign.invalidate();
      toast.success("Campaign updated");
      resetForm();
    },
    onError: e => toast.error(e.message || "Failed to update campaign"),
  });
  const deleteCampaign = trpc.scratch.adminDeleteCampaign.useMutation({
    onSuccess: async () => {
      await utils.scratch.adminListCampaigns.invalidate();
      setSelectedId(null);
      toast.success("Campaign deleted");
    },
    onError: e => toast.error(e.message || "Failed to delete campaign"),
  });
  const deleteTier = trpc.scratch.adminDeletePrizeTier.useMutation({
    onSuccess: async () => {
      await utils.scratch.adminGetCampaign.invalidate();
      toast.success("Prize tier deleted");
    },
    onError: e => toast.error(e.message || "Failed to delete tier"),
  });
  const [simReport, setSimReport] = useState<any>(null);
  const simulate = trpc.scratch.adminSimulate.useMutation({
    onSuccess: r => setSimReport(r),
    onError: e => toast.error(e.message || "Simulation failed"),
  });

  // Campaign form state (create + edit a draft).
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gameType, setGameType] = useState<ScratchGameType>("matching_numbers");
  const [winningCount, setWinningCount] = useState(3);
  const [playerCount, setPlayerCount] = useState(5);
  const [minNumber, setMinNumber] = useState(1);
  const [maxNumber, setMaxNumber] = useState(30);
  const [requiredMatches, setRequiredMatches] = useState(2);
  const [winPercent, setWinPercent] = useState(20);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [expiresAt, setExpiresAt] = useState("");
  const [termsUrl, setTermsUrl] = useState("");
  // Symbols / amounts (group) + pattern config
  const [poolText, setPoolText] = useState("🍋, 👑, 💎, 🔔, ⭐, 🍀");
  const [positions, setPositions] = useState(9);
  const [groupRequired, setGroupRequired] = useState(3);
  const [gridSize, setGridSize] = useState(3);
  const [patternPool, setPatternPool] = useState("★, ●, ▲, ◆");
  const [patternSet, setPatternSet] = useState<PatternId[]>(["row", "col", "diag"]);
  // Compliance (optional)
  const [minAge, setMinAge] = useState(0);
  const [countries, setCountries] = useState("");
  const [kycDollars, setKycDollars] = useState(0);
  const [disclaimer, setDisclaimer] = useState("");

  const parseList = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);

  const buildConfig = () => {
    if (gameType === "matching_numbers")
      return { winningCount, playerCount, minNumber, maxNumber, requiredMatches };
    if (gameType === "pattern")
      return { gridSize, pool: parseList(patternPool), patterns: patternSet };
    return { pool: parseList(poolText), positions, requiredMatches: groupRequired };
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setGameType("matching_numbers");
    setWinningCount(3);
    setPlayerCount(5);
    setMinNumber(1);
    setMaxNumber(30);
    setRequiredMatches(2);
    setWinPercent(20);
    setDailyLimit(3);
    setExpiresAt("");
    setTermsUrl("");
    setPoolText("🍋, 👑, 💎, 🔔, ⭐, 🍀");
    setPositions(9);
    setGroupRequired(3);
    setGridSize(3);
    setPatternPool("★, ●, ▲, ◆");
    setPatternSet(["row", "col", "diag"]);
    setMinAge(0);
    setCountries("");
    setKycDollars(0);
    setDisclaimer("");
  };

  const startEdit = (c: {
    id: number;
    name: string;
    description: string | null;
    gameType: ScratchGameType;
    config: unknown;
    winProbabilityBps: number;
    dailyPlayLimit: number;
    termsUrl: string | null;
    minAge?: number;
    countries?: string | null;
    kycThresholdCents?: number;
    disclaimer?: string | null;
    expiresAt: string | Date | null;
  }) => {
    const cfg = (typeof c.config === "string" ? JSON.parse(c.config) : c.config) as any;
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description ?? "");
    setGameType(c.gameType);
    if (c.gameType === "matching_numbers") {
      setWinningCount(cfg.winningCount);
      setPlayerCount(cfg.playerCount);
      setMinNumber(cfg.minNumber);
      setMaxNumber(cfg.maxNumber);
      setRequiredMatches(cfg.requiredMatches);
    } else if (c.gameType === "pattern") {
      setGridSize(cfg.gridSize);
      setPatternPool((cfg.pool ?? []).join(", "));
      setPatternSet(cfg.patterns ?? []);
    } else {
      setPoolText((cfg.pool ?? []).join(", "));
      setPositions(cfg.positions);
      setGroupRequired(cfg.requiredMatches);
    }
    setWinPercent(c.winProbabilityBps / 100);
    setDailyLimit(c.dailyPlayLimit);
    setTermsUrl(c.termsUrl ?? "");
    setMinAge(c.minAge ?? 0);
    setCountries(c.countries ?? "");
    setKycDollars((c.kycThresholdCents ?? 0) / 100);
    setDisclaimer(c.disclaimer ?? "");
    setExpiresAt(c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const common = {
      name,
      description: description || undefined,
      config: buildConfig(),
      winProbabilityBps: Math.round(winPercent * 100),
      dailyPlayLimit: dailyLimit,
      termsUrl: termsUrl || undefined,
      minAge,
      countries: countries || undefined,
      kycThresholdCents: Math.round(kycDollars * 100),
      disclaimer: disclaimer || undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    };
    if (editingId) updateCampaign.mutate({ id: editingId, ...common });
    else createCampaign.mutate({ gameType, ...common });
  };

  const togglePattern = (p: PatternId) =>
    setPatternSet(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );

  const confirmSetStatus = (
    c: { id: number; name: string },
    status: "draft" | "active" | "paused" | "ended"
  ) => {
    const msg =
      status === "active"
        ? `Activate "${c.name}"? It becomes live to players immediately.`
        : status === "ended"
          ? `End "${c.name}"? Players can no longer play it.`
          : null;
    if (msg && !window.confirm(msg)) return;
    setStatus.mutate({ id: c.id, status });
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
      <div className="container max-w-5xl">
        <AdminNav active="scratch" />

        <div className="space-y-6">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
          {/* Create / edit campaign */}
          <Card className="p-6">
            <h3 className="heading-md mb-1">
              {editingId ? "Edit Draft Campaign" : "New Campaign"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {GAME_TYPE_LABELS[gameType]}. Created as a draft — add prizes, then
              set it Active.
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
                  placeholder="Scratch to match and win vouchers!" />
              </div>
              <div>
                <Label htmlFor="cgame">Game type</Label>
                <select
                  id="cgame"
                  value={gameType}
                  disabled={!!editingId}
                  onChange={e => setGameType(e.target.value as ScratchGameType)}
                  className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm disabled:opacity-60"
                >
                  {Object.entries(GAME_TYPE_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
                {editingId && (
                  <p className="text-xs text-gray-400 mt-1">Game type can't be changed after creation.</p>
                )}
              </div>

              {gameType === "matching_numbers" && (
                <>
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
                </>
              )}

              {(gameType === "matching_symbols" || gameType === "matching_amounts") && (
                <>
                  <div>
                    <Label>
                      {gameType === "matching_amounts" ? "Amounts" : "Symbols"} (comma-separated)
                    </Label>
                    <Input value={poolText} onChange={e => setPoolText(e.target.value)}
                      placeholder={gameType === "matching_amounts" ? "$2, $5, $10, $20" : "🍋, 👑, 💎, 🔔, ⭐, 🍀"} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Scratch positions</Label>
                      <Input type="number" min={3} max={25} value={positions}
                        onChange={e => setPositions(+e.target.value)} />
                    </div>
                    <div>
                      <Label>Match to win</Label>
                      <Input type="number" min={2} max={positions} value={groupRequired}
                        onChange={e => setGroupRequired(+e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {gameType === "pattern" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Grid size</Label>
                      <Input type="number" min={3} max={5} value={gridSize}
                        onChange={e => setGridSize(+e.target.value)} />
                    </div>
                    <div>
                      <Label>Symbols (comma-separated)</Label>
                      <Input value={patternPool} onChange={e => setPatternPool(e.target.value)}
                        placeholder="★, ●, ▲, ◆" />
                    </div>
                  </div>
                  <div>
                    <Label>Winning patterns</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {PATTERN_OPTIONS.map(p => (
                        <button key={p.id} type="button"
                          onClick={() => togglePattern(p.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                            patternSet.includes(p.id)
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white text-gray-600 border-gray-300"
                          }`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
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

              {/* Compliance (optional) */}
              <details className="rounded-lg border border-gray-200 p-3">
                <summary className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Compliance (optional)
                </summary>
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Min age (0 = none)</Label>
                      <Input type="number" min={0} max={120} value={minAge}
                        onChange={e => setMinAge(+e.target.value)} />
                    </div>
                    <div>
                      <Label>KYC over $ (0 = off)</Label>
                      <Input type="number" min={0} step="0.01" value={kycDollars}
                        onChange={e => setKycDollars(+e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Allowed countries (comma-separated; blank = all)</Label>
                    <Input value={countries} onChange={e => setCountries(e.target.value)}
                      placeholder="Cambodia, Thailand, Vietnam" />
                  </div>
                  <div>
                    <Label>Disclaimer / responsible-play note</Label>
                    <Textarea rows={2} value={disclaimer}
                      onChange={e => setDisclaimer(e.target.value)}
                      placeholder="Promotional game. No purchase necessary. Prizes may be subject to tax…" />
                  </div>
                  <p className="text-xs text-gray-400">
                    Age / country / a Terms URL trigger an eligibility gate before the
                    first play. Wins at or above the KYC amount are held for identity
                    review instead of paying out instantly.
                  </p>
                </div>
              </details>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createCampaign.isPending || updateCampaign.isPending}
                  className="flex-1 btn-primary"
                >
                  {editingId
                    ? updateCampaign.isPending
                      ? "Saving…"
                      : "Save changes"
                    : createCampaign.isPending
                      ? "Creating…"
                      : "Create draft campaign"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
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
                        onClick={() => confirmSetStatus(c, s)}>
                        {s === "active" ? "Activate" : s === "draft" ? "To draft"
                          : s === "paused" ? "Pause" : "End"}
                      </Button>
                    ))}
                    <Button type="button" size="sm"
                      variant={selectedId === c.id ? "default" : "outline"}
                      onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}>
                      {selectedId === c.id ? "Close" : "Manage prizes"}
                    </Button>
                    {c.status === "draft" && (
                      <>
                        <Button type="button" size="sm" variant="outline"
                          onClick={() => startEdit(c)}>
                          Edit
                        </Button>
                        <Button type="button" size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          variant="outline"
                          disabled={deleteCampaign.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete draft "${c.name}"? This can't be undone.`))
                              deleteCampaign.mutate({ id: c.id });
                          }}>
                          Delete
                        </Button>
                      </>
                    )}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="heading-md">{detail.campaign.name} — prizes</h3>
              <div className="text-sm text-gray-600 flex flex-wrap gap-4">
                <span>{detail.plays} plays</span>
                <span>{detail.winners} winners</span>
                <span>Exposure {money(detail.liability.maxExposureCents)}</span>
                <span className="text-green-700">Paid {money(detail.liability.claimedValueCents)}</span>
              </div>
            </div>

            {/* Go-live readiness */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    Ready to go live?
                  </p>
                  <ul className="text-sm space-y-0.5">
                    {[
                      ["Win chance above 0%", detail.readiness.checks.hasWinChance],
                      ["At least one prize tier", detail.readiness.checks.hasTier],
                      ["Available prize inventory", detail.readiness.checks.hasInventory],
                    ].map(([label, ok]) => (
                      <li key={label as string} className={ok ? "text-green-700" : "text-gray-500"}>
                        {ok ? "✅" : "⬜️"} {label}
                      </li>
                    ))}
                  </ul>
                </div>
                {detail.campaign.status !== "active" ? (
                  <Button
                    disabled={!detail.readiness.ready || setStatus.isPending}
                    onClick={() => confirmSetStatus(detail.campaign, "active")}
                    className="btn-primary"
                  >
                    {detail.readiness.ready ? "Activate campaign" : "Not ready yet"}
                  </Button>
                ) : (
                  <span className="text-sm font-semibold text-green-700">● Live</span>
                )}
              </div>
            </div>

            {/* Tier list */}
            <div className="space-y-2">
              {detail.tiers.map(t => {
                const locked = t.claimedQty > 0 || t.reservedQty > 0;
                return (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {t.name} · <span className="text-purple-600">{t.valueLabel}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {detail.campaign.gameType === "pattern"
                          ? `pattern ${t.matchKey ?? "—"}`
                          : detail.campaign.gameType === "matching_amounts"
                            ? `${t.matchKey ?? "—"} ×${t.requiredMatches}`
                            : `needs ${t.requiredMatches} matches`}{" "}
                        · weight {t.weight} · {t.remaining}/{t.totalQty} left ·
                        vouchers {t.voucherAvailable}/{t.voucherTotal}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AddVouchers tierId={t.id}
                        onAdd={codes => addVouchers.mutate({ prizeTierId: t.id, codes })}
                        pending={addVouchers.isPending} />
                      <Button type="button" size="sm" variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={locked || deleteTier.isPending}
                        title={locked ? "Has awarded/reserved prizes" : "Delete tier"}
                        onClick={() => {
                          if (window.confirm(`Delete tier "${t.name}"?`))
                            deleteTier.mutate({ id: t.id });
                        }}>
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
              {detail.tiers.length === 0 && (
                <p className="text-sm text-gray-500">No prize tiers yet — add one below.</p>
              )}
            </div>

            {(() => {
              const gt = detail.campaign.gameType as ScratchGameType;
              const cfg = (typeof detail.campaign.config === "string"
                ? JSON.parse(detail.campaign.config)
                : detail.campaign.config) as any;
              let minMatches = 1;
              let maxMatches = 1;
              let amountOptions: string[] = [];
              let patternOptions: PatternId[] = [];
              if (gt === "matching_numbers") {
                minMatches = cfg.requiredMatches;
                maxMatches = Math.min(cfg.winningCount, cfg.playerCount);
              } else if (gt === "matching_symbols") {
                minMatches = cfg.requiredMatches;
                maxMatches = cfg.positions;
              } else if (gt === "matching_amounts") {
                minMatches = cfg.requiredMatches;
                maxMatches = cfg.positions;
                amountOptions = cfg.pool ?? [];
              } else if (gt === "pattern") {
                patternOptions = cfg.patterns ?? [];
              }
              return (
                <AddTier
                  key={detail.campaign.id}
                  campaignId={detail.campaign.id}
                  gameType={gt}
                  minMatches={minMatches}
                  maxMatches={maxMatches}
                  amountOptions={amountOptions}
                  patternOptions={patternOptions}
                  onAdd={input => createTier.mutate(input)}
                  pending={createTier.isPending}
                />
              );
            })()}

            {/* Probability simulation (never touches live inventory) */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Probability simulation</p>
                  <p className="text-xs text-gray-500">
                    Project win rate &amp; prize exposure over 100k plays — no live inventory touched.
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled={simulate.isPending}
                  onClick={() => {
                    setSimReport(null);
                    simulate.mutate({ campaignId: detail.campaign.id, runs: 100000 });
                  }}>
                  {simulate.isPending ? "Running…" : "Simulate 100k"}
                </Button>
              </div>
              {simReport && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                  <div>
                    <div className="font-bold text-purple-600">{(simReport.actualWinRate * 100).toFixed(2)}%</div>
                    <div className="text-xs text-gray-500">actual win rate</div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-700">{(simReport.expectedWinRate * 100).toFixed(2)}%</div>
                    <div className="text-xs text-gray-500">target</div>
                  </div>
                  <div>
                    <div className="font-bold text-purple-600">{money(simReport.awardedValueCents)}</div>
                    <div className="text-xs text-gray-500">awarded / {money(simReport.maxExposureCents)}</div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-700">
                      {simReport.inventoryExhausted ? `run ${simReport.exhaustedAtRun}` : "no"}
                    </div>
                    <div className="text-xs text-gray-500">inventory ran out?</div>
                  </div>
                  <div className="col-span-2 sm:col-span-4 text-left">
                    <p className="text-xs text-gray-500 mb-1">Wins per tier:</p>
                    <div className="flex flex-wrap gap-2">
                      {simReport.perTier.map((pt: any) => (
                        <span key={pt.id} className="text-xs bg-gray-50 rounded px-2 py-1">
                          {pt.label}: {pt.wins}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
    </div>
  );
}

function AddTier({
  campaignId,
  gameType,
  minMatches,
  maxMatches,
  amountOptions,
  patternOptions,
  onAdd,
  pending,
}: {
  campaignId: number;
  gameType: ScratchGameType;
  minMatches: number;
  maxMatches: number;
  amountOptions: string[];
  patternOptions: PatternId[];
  onAdd: (input: {
    campaignId: number;
    name: string;
    valueLabel: string;
    valueCents: number;
    requiredMatches?: number;
    matchKey?: string;
    totalQty: number;
    weight: number;
  }) => void;
  pending: boolean;
}) {
  const needsMatches = gameType !== "pattern";
  const needsAmount = gameType === "matching_amounts";
  const needsPattern = gameType === "pattern";

  const [name, setName] = useState("");
  const [valueLabel, setValueLabel] = useState("");
  const [valueDollars, setValueDollars] = useState(10);
  const [requiredMatches, setRequiredMatches] = useState(minMatches);
  const [totalQty, setTotalQty] = useState(50);
  const [weight, setWeight] = useState(1);
  const [matchKey, setMatchKey] = useState(
    needsAmount ? amountOptions[0] ?? "" : needsPattern ? patternOptions[0] ?? "" : ""
  );
  const matchesOutOfRange =
    needsMatches && (requiredMatches < minMatches || requiredMatches > maxMatches);

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
          totalQty,
          weight,
          ...(needsMatches ? { requiredMatches } : {}),
          ...(needsAmount || needsPattern ? { matchKey } : {}),
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

      {needsAmount && (
        <div>
          <Label>Winning amount</Label>
          <select value={matchKey} onChange={e => setMatchKey(e.target.value)}
            className="w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-sm">
            {amountOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}
      {needsPattern && (
        <div>
          <Label>Winning pattern</Label>
          <select value={matchKey} onChange={e => setMatchKey(e.target.value)}
            className="w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-sm">
            {patternOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}
      {needsMatches && (
        <div>
          <Label>Matches</Label>
          <Input type="number" min={minMatches} max={maxMatches} value={requiredMatches}
            onChange={e => setRequiredMatches(+e.target.value)}
            className={matchesOutOfRange ? "border-red-400" : ""} />
        </div>
      )}
      <div>
        <Label>Qty</Label>
        <Input type="number" min={1} value={totalQty} onChange={e => setTotalQty(+e.target.value)} />
      </div>
      <div>
        <Label>Weight</Label>
        <Input type="number" min={1} value={weight} onChange={e => setWeight(+e.target.value)} />
      </div>
      <div className="sm:col-span-6 space-y-2">
        {needsMatches && (
          <p className="text-xs text-gray-500">
            Matches to win must be{" "}
            <b>{minMatches === maxMatches ? minMatches : `${minMatches}–${maxMatches}`}</b>{" "}
            for this campaign. More matches = a rarer, higher tier.
          </p>
        )}
        {needsPattern && (
          <p className="text-xs text-gray-500">
            Each tier maps a winning pattern to a prize. Add one tier per pattern.
          </p>
        )}
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
