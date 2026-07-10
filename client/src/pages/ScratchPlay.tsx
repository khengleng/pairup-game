import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useTelegramBackButton } from "@/lib/telegramUi";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ScratchCard from "@/components/ScratchCard";
import { getTelegramInitData } from "@/lib/telegram";
import { toast } from "sonner";
import { Ticket, Sparkles, Copy, Eye } from "lucide-react";

type PlayState = {
  sessionId: number;
  card: { winningNumbers: number[]; playerNumbers: number[] };
  isWinner: boolean;
  matchCount: number;
  matchedNumbers: number[];
  requiredMatches: number;
  prizeLabel: string | null;
};

type Completion = {
  isWinner: boolean;
  claimRef: string | null;
  prizeLabel: string | null;
  voucherCode: string | null;
  status: string | null;
};

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

  const [play, setPlay] = useState<PlayState | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [forceReveal, setForceReveal] = useState(false);
  const [completion, setCompletion] = useState<Completion | null>(null);

  const winningSet = new Set(play?.card.winningNumbers ?? []);

  const handleStart = async () => {
    if (!campaignId) return;
    setPlay(null);
    setRevealed(false);
    setForceReveal(false);
    setCompletion(null);
    try {
      const res = await startMutation.mutateAsync({ campaignId, initData });
      setPlay(res);
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
              <p className="text-sm text-gray-600">
                Match <b>{"any winning number"}</b> on your card to win. Tap below
                for a fresh card, then scratch to reveal.
              </p>
              <Button
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="w-full btn-primary text-lg py-6"
              >
                {startMutation.isPending ? "Dealing…" : "Get a card"}
              </Button>
              {campaign.prizes.length > 0 && (
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Prizes
                  </p>
                  <ul className="space-y-1">
                    {campaign.prizes.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between text-sm rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <span className="text-gray-700">{p.name}</span>
                        <span className="font-semibold text-purple-600">
                          {p.valueLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Winning numbers (revealed) */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-center">
                  Winning numbers
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {play.card.winningNumbers.map((n, i) => (
                    <span
                      key={i}
                      className="w-11 h-11 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white font-bold flex items-center justify-center tabular-nums"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              {/* Player numbers under the scratch layer */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-center">
                  Your numbers — scratch to reveal
                </p>
                <ScratchCard
                  className="rounded-xl overflow-hidden border border-purple-200"
                  coverColor="#B9BEC6"
                  coverLabel="Scratch here"
                  threshold={0.5}
                  forceReveal={forceReveal}
                  onReveal={handleReveal}
                >
                  <div className="grid grid-cols-5 gap-2 p-4 bg-white">
                    {play.card.playerNumbers.map((n, i) => {
                      const hit = winningSet.has(n);
                      return (
                        <span
                          key={i}
                          className={`aspect-square rounded-lg font-bold flex items-center justify-center tabular-nums text-lg ${
                            hit
                              ? "bg-gradient-to-br from-amber-300 to-amber-400 text-amber-900 ring-2 ring-amber-500"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {n}
                        </span>
                      );
                    })}
                  </div>
                </ScratchCard>
              </div>

              {!revealed && (
                <button
                  onClick={() => setForceReveal(true)}
                  className="mx-auto flex items-center gap-2 text-sm font-semibold text-purple-600 underline"
                >
                  <Eye className="w-4 h-4" />
                  Reveal result
                </button>
              )}

              {/* Result */}
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
                      <p className="text-sm text-gray-600">
                        {play.matchCount} matching number
                        {play.matchCount === 1 ? "" : "s"}.
                      </p>
                      {completion?.voucherCode && (
                        <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            Your voucher code
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <code className="text-lg font-bold text-green-700">
                              {completion.voucherCode}
                            </code>
                            <button
                              onClick={() => copyCode(completion.voucherCode!)}
                              aria-label="Copy code"
                              className="text-green-600"
                            >
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
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-gray-700">
                        No win this time
                      </p>
                      <p className="text-sm text-gray-500">
                        {play.matchCount > 0
                          ? `So close — ${play.matchCount} match${
                              play.matchCount === 1 ? "" : "es"
                            }, needed ${play.requiredMatches}.`
                          : "Better luck on the next card!"}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleStart}
                    disabled={startMutation.isPending}
                    className="w-full btn-primary"
                  >
                    {startMutation.isPending ? "Dealing…" : "Play again"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {campaign.termsUrl && (
          <p className="text-center text-xs text-gray-400">
            <a
              href={campaign.termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Terms &amp; conditions apply
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
