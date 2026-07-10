import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useTelegramBackButton } from "@/lib/telegramUi";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ScratchCard from "@/components/ScratchCard";
import { getTelegramInitData } from "@/lib/telegram";
import type { ScratchGameType, PatternId } from "@shared/scratch/types";
import { toast } from "sonner";
import { Ticket, Sparkles, Copy, Eye } from "lucide-react";

type PlayState = {
  sessionId: number;
  gameType: ScratchGameType;
  card: any;
  isWinner: boolean;
  prizeLabel: string | null;
  reveal: {
    winningCells?: number[];
    winningKey?: string | null;
    winningPattern?: PatternId | null;
    matchCount?: number;
    matchedNumbers?: number[];
    requiredMatches?: number;
  };
};

type Completion = {
  isWinner: boolean;
  claimRef: string | null;
  prizeLabel: string | null;
  voucherCode: string | null;
  status: string | null;
};

/** A grid of revealed cells; winning indices get the gold highlight. */
function CellGrid({
  cells,
  cols,
  winning,
}: {
  cells: (string | number)[];
  cols: number;
  winning: Set<number>;
}) {
  return (
    <div
      className="grid gap-2 p-4 bg-white"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {cells.map((c, i) => (
        <span
          key={i}
          className={`aspect-square rounded-lg font-bold flex items-center justify-center text-xl tabular-nums ${
            winning.has(i)
              ? "bg-gradient-to-br from-amber-300 to-amber-400 text-amber-900 ring-2 ring-amber-500"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export default function ScratchPlay() {
  const [, setLocation] = useLocation();
  useTelegramBackButton(() => setLocation("/scratch"));
  const [, params] = useRoute("/scratch/:id");
  const campaignId = params?.id ? parseInt(params.id, 10) : null;
  const initData = getTelegramInitData();
  const utils = trpc.useUtils();

  const { data: campaign, isLoading } = trpc.scratch.getCampaign.useQuery(
    { id: campaignId ?? 0 },
    { enabled: !!campaignId }
  );
  const startMutation = trpc.scratch.start.useMutation();
  const completeMutation = trpc.scratch.complete.useMutation();
  const { data: compliance } = trpc.scratch.getCompliance.useQuery(
    { campaignId: campaignId ?? 0, initData },
    { enabled: !!campaignId }
  );
  const acceptTerms = trpc.scratch.acceptTerms.useMutation({
    onSuccess: async () => {
      await utils.scratch.getCompliance.invalidate();
    },
    onError: e => toast.error(e.message || "Couldn't record your acceptance."),
  });
  const [ageOk, setAgeOk] = useState(false);
  const [country, setCountry] = useState("");

  const [play, setPlay] = useState<PlayState | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [forceReveal, setForceReveal] = useState(false);
  const [completion, setCompletion] = useState<Completion | null>(null);

  const handleStart = async () => {
    if (!campaignId) return;
    setPlay(null);
    setRevealed(false);
    setForceReveal(false);
    setCompletion(null);
    try {
      const res = await startMutation.mutateAsync({ campaignId, initData });
      setPlay(res as PlayState);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't start the game.");
    }
  };

  const handleReveal = async () => {
    if (!play || revealed) return;
    setRevealed(true);
    try {
      const res = await completeMutation.mutateAsync({
        sessionId: play.sessionId,
        initData,
      });
      setCompletion(res);
      if (res.isWinner) {
        toast.success(`🎉 You won ${res.prizeLabel ?? "a prize"}!`);
      }
      await utils.scratch.myHistory.invalidate();
    } catch {
      toast.error("Couldn't confirm your result. Please try again.");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => toast.success("Voucher code copied"),
      () => toast.error("Copy failed — write it down.")
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pairup-gradient">
        <div className="w-10 h-10 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center pairup-gradient">
        <Card className="p-8 text-center space-y-4 max-w-sm mx-4">
          <p className="text-gray-600">This game isn't available.</p>
          <Button onClick={() => setLocation("/scratch")} className="btn-primary">
            See other games
          </Button>
        </Card>
      </div>
    );
  }

  // Build the scratchable board for the current card.
  const renderBoard = () => {
    if (!play) return null;
    const winning = new Set(play.reveal.winningCells ?? []);

    if (play.gameType === "matching_numbers") {
      const winSet = new Set<number>(play.card.winningNumbers ?? []);
      const playerNumbers: number[] = play.card.playerNumbers ?? [];
      const cells = playerNumbers;
      const winIdx = new Set<number>(
        playerNumbers.map((n, i) => (winSet.has(n) ? i : -1)).filter(i => i >= 0)
      );
      return (
        <>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-center">
              Winning numbers
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {(play.card.winningNumbers ?? []).map((n: number, i: number) => (
                <span key={i}
                  className="w-11 h-11 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white font-bold flex items-center justify-center tabular-nums">
                  {n}
                </span>
              ))}
            </div>
          </div>
          <ScratchBoard forceReveal={forceReveal} onReveal={handleReveal}
            label="Your numbers — scratch to reveal">
            <CellGrid cells={cells} cols={5} winning={winIdx} />
          </ScratchBoard>
        </>
      );
    }

    if (play.gameType === "matching_symbols" || play.gameType === "matching_amounts") {
      const cells: string[] = play.card.cells ?? [];
      const cols = Math.ceil(Math.sqrt(cells.length)) || 3;
      return (
        <ScratchBoard forceReveal={forceReveal} onReveal={handleReveal}
          label="Scratch to reveal">
          <CellGrid cells={cells} cols={cols} winning={winning} />
        </ScratchBoard>
      );
    }

    // pattern
    const grid: string[] = play.card.grid ?? [];
    const size: number = play.card.size ?? Math.sqrt(grid.length);
    return (
      <ScratchBoard forceReveal={forceReveal} onReveal={handleReveal}
        label="Scratch the grid — complete a line to win">
        <CellGrid cells={grid} cols={size} winning={winning} />
      </ScratchBoard>
    );
  };

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container max-w-xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
          </div>
          <Button variant="outline" onClick={() => setLocation("/scratch")}>
            Back
          </Button>
        </div>

        <Card className="p-6 space-y-6">
          {campaign.description && !play && (
            <p className="text-gray-600 text-center">{campaign.description}</p>
          )}

          {!play ? (
            <div className="text-center space-y-4">
              {compliance?.disclaimer && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 text-left">
                  {compliance.disclaimer}
                </p>
              )}

              {compliance?.required && !compliance.accepted ? (
                <div className="text-left space-y-3 border border-purple-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-800">Before you play</p>
                  {compliance.minAge > 0 && (
                    <label className="flex items-start gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={ageOk}
                        onChange={e => setAgeOk(e.target.checked)} className="mt-1" />
                      <span>I confirm I am at least {compliance.minAge} years old.</span>
                    </label>
                  )}
                  {compliance.countries.length > 0 && (
                    <div className="text-sm">
                      <label className="block text-gray-700 mb-1">Your country</label>
                      <select value={country} onChange={e => setCountry(e.target.value)}
                        className="w-full h-9 rounded-md border border-gray-300 px-2">
                        <option value="">Select…</option>
                        {compliance.countries.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {compliance.termsUrl && (
                    <p className="text-xs text-gray-500">
                      By continuing you accept the{" "}
                      <a href={compliance.termsUrl} target="_blank" rel="noopener noreferrer"
                        className="underline text-purple-600">terms &amp; conditions</a>.
                    </p>
                  )}
                  <Button
                    onClick={() =>
                      acceptTerms.mutate({
                        campaignId: campaignId!,
                        initData,
                        ageConfirmed: compliance.minAge > 0 ? ageOk : true,
                        country: compliance.countries.length > 0 ? country : undefined,
                      })
                    }
                    disabled={
                      acceptTerms.isPending ||
                      (compliance.minAge > 0 && !ageOk) ||
                      (compliance.countries.length > 0 && !country)
                    }
                    className="w-full btn-primary"
                  >
                    {acceptTerms.isPending ? "…" : "I agree — continue"}
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Tap below for a fresh card, then scratch to reveal your result.
                  </p>
                  <Button onClick={handleStart} disabled={startMutation.isPending}
                    className="w-full btn-primary text-lg py-6">
                    {startMutation.isPending ? "Dealing…" : "Get a card"}
                  </Button>
                </>
              )}
              {campaign.prizes.length > 0 && (
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Prizes
                  </p>
                  <ul className="space-y-1">
                    {campaign.prizes.map((p, i) => (
                      <li key={i}
                        className="flex items-center justify-between text-sm rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-gray-700">{p.name}</span>
                        <span className="font-semibold text-purple-600">{p.valueLabel}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {renderBoard()}

              {!revealed && (
                <button onClick={() => setForceReveal(true)}
                  className="mx-auto flex items-center gap-2 text-sm font-semibold text-purple-600 underline">
                  <Eye className="w-4 h-4" />
                  Reveal result
                </button>
              )}

              {revealed && (
                <div className="text-center space-y-4">
                  {completeMutation.isPending && !completion ? (
                    <p className="text-gray-500">Checking your card…</p>
                  ) : play.isWinner ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-2xl font-bold text-green-600">
                        <Sparkles className="w-6 h-6" />
                        You won {completion?.prizeLabel ?? play.prizeLabel}!
                      </div>
                      {completion?.voucherCode && (
                        <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            Your voucher code
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <code className="text-lg font-bold text-green-700">
                              {completion.voucherCode}
                            </code>
                            <button onClick={() => copyCode(completion.voucherCode!)}
                              aria-label="Copy code" className="text-green-600">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      {completion?.claimRef && (
                        <p className="text-xs text-gray-500">
                          Claim reference:{" "}
                          <span className="font-mono">{completion.claimRef}</span>
                          {completion.status === "pending" &&
                            " · we'll be in touch to fulfil your prize."}
                          {completion.status === "verification" &&
                            " · we'll verify your identity before releasing this prize."}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-gray-700">No win this time</p>
                      <p className="text-sm text-gray-500">Better luck on the next card!</p>
                    </div>
                  )}

                  <Button onClick={handleStart} disabled={startMutation.isPending}
                    className="w-full btn-primary">
                    {startMutation.isPending ? "Dealing…" : "Play again"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {campaign.termsUrl && (
          <p className="text-center text-xs text-gray-400">
            <a href={campaign.termsUrl} target="_blank" rel="noopener noreferrer"
              className="underline">
              Terms &amp; conditions apply
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

/** A labelled scratch surface wrapping a board. */
function ScratchBoard({
  label,
  forceReveal,
  onReveal,
  children,
}: {
  label: string;
  forceReveal: boolean;
  onReveal: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-center">
        {label}
      </p>
      <ScratchCard
        className="rounded-xl overflow-hidden border border-purple-200"
        coverColor="#B9BEC6"
        coverLabel="Scratch here"
        threshold={0.5}
        forceReveal={forceReveal}
        onReveal={onReveal}
      >
        {children}
      </ScratchCard>
    </div>
  );
}
