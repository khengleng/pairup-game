import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTelegramInitData } from "@/lib/telegram";
import {
  useShakeDetector,
  motionSupported,
  hasTelegramMotion,
} from "@/lib/useShakeDetector";
import { useTelegramBackButton, haptic } from "@/lib/telegramUi";
import { KhmerIcon } from "@/lib/khmerIcons";
import {
  KLAKLOK_SYMBOLS,
  KLAKLOK_STAKES,
  getKlaklokSymbol,
} from "@shared/shakeLogic";
import { toast } from "sonner";
import { Coins, Smartphone, Trophy } from "lucide-react";

const SYMBOL_IDS = KLAKLOK_SYMBOLS.map(s => s.id);
const randomSymbol = () =>
  SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)];
const STARTING_CHIPS = 100;

function DieTile({
  id,
  matched,
  rolling,
}: {
  id: string;
  matched: boolean;
  rolling: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 p-2 transition-all ${
        rolling ? "animate-bounce" : ""
      } ${
        matched
          ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300"
          : "bg-white border-purple-200"
      }`}
    >
      <KhmerIcon id={id} className="w-14 h-14 sm:w-16 sm:h-16" />
    </div>
  );
}

export default function Klaklok() {
  const [, setLocation] = useLocation();
  const initData = getTelegramInitData();
  const utils = trpc.useUtils();

  const rollMutation = trpc.shake.rollKlaklok.useMutation();
  const { data: myStats } = trpc.shake.getMyStats.useQuery({
    game: "klaklok",
    initData,
  });
  const { data: leaderboard } = trpc.shake.getLeaderboard.useQuery({
    game: "klaklok",
    limit: 10,
  });

  const [pick, setPick] = useState<string | null>(null);
  const [stake, setStake] = useState<number>(KLAKLOK_STAKES[1]);
  const [chips, setChips] = useState<number>(STARTING_CHIPS);
  const [symbols, setSymbols] = useState<string[]>([
    SYMBOL_IDS[0],
    SYMBOL_IDS[1],
    SYMBOL_IDS[2],
  ]);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<{
    count: number;
    net: number;
    isJackpot: boolean;
  } | null>(null);

  // Keep the latest bet available to the shake handler without resubscribing.
  const rollingRef = useRef(false);
  const betRef = useRef({ pick, stake, chips });
  betRef.current = { pick, stake, chips };

  const doRoll = async () => {
    const { pick: p, stake: s, chips: c } = betRef.current;
    if (rollingRef.current) return;
    if (!p) {
      toast.error("Pick a symbol to bet on first.");
      return;
    }
    if (c < s) {
      toast.error("Not enough chips for that stake.");
      return;
    }
    rollingRef.current = true;
    setRolling(true);
    setResult(null);

    const tumble = setInterval(() => {
      setSymbols([randomSymbol(), randomSymbol(), randomSymbol()]);
    }, 90);

    try {
      const res = await rollMutation.mutateAsync({
        pick: p,
        stake: s,
        initData,
      });
      await new Promise(r => setTimeout(r, 600));
      clearInterval(tumble);
      const { bet } = res;
      setSymbols(bet.symbols);
      setResult({ count: bet.count, net: bet.net, isJackpot: bet.isJackpot });
      setChips(prev => Math.max(0, prev + bet.net));

      const name = getKlaklokSymbol(p)?.name ?? "";
      if (bet.count === 3) {
        haptic.notify("success");
        toast.success(`🎉 Triple ${name}! +${bet.net} chips!`);
      } else if (bet.count === 2) {
        haptic.notify("success");
        toast.success(`Two ${name}s — +${bet.net} chips!`);
      } else if (bet.count === 1) {
        haptic.impact("medium");
        toast.success(`One ${name} — +${bet.net} chips.`);
      } else {
        haptic.notify("warning");
        toast(`No ${name} this time — ${bet.net} chips.`);
      }

      await Promise.all([
        utils.shake.getMyStats.invalidate({ game: "klaklok" }),
        utils.shake.getLeaderboard.invalidate({ game: "klaklok" }),
      ]);
    } catch {
      clearInterval(tumble);
      toast.error("Couldn't roll. Try again.");
    } finally {
      setRolling(false);
      rollingRef.current = false;
    }
  };

  const { isListening, error, start, stop } = useShakeDetector(doRoll);
  useTelegramBackButton(() => setLocation("/"));

  useEffect(() => {
    if (hasTelegramMotion()) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = myStats?.stats;
  const broke = chips < KLAKLOK_STAKES[0];
  const canRoll = !!pick && !rolling && chips >= stake;

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <KhmerIcon id="tiger" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Klaklok</h1>
              <p className="text-xs text-gray-500 -mt-0.5">
                ខ្លាឃ្លោក · bet a symbol, shake to roll
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white border border-purple-200 px-3 py-1.5 shadow-sm">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-gray-900 tabular-nums">{chips}</span>
            <span className="text-xs text-gray-500">chips</span>
          </div>
        </div>

        {/* Dice */}
        <Card className="p-6 sm:p-8 text-center space-y-6">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {symbols.map((s, i) => (
              <DieTile
                key={i}
                id={s}
                rolling={rolling}
                matched={!!result && !!pick && s === pick}
              />
            ))}
          </div>

          <div className="h-8">
            {result && (
              <p
                className={`text-2xl font-bold ${
                  result.net >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {result.count === 0
                  ? "No match"
                  : `${result.count}× — pays ${result.count} to 1`}{" "}
                <span>
                  {result.net >= 0 ? "+" : ""}
                  {result.net}
                </span>
              </p>
            )}
          </div>

          {/* Pick a symbol */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">
              1 · Bet on a symbol
            </p>
            <div className="grid grid-cols-6 gap-2">
              {KLAKLOK_SYMBOLS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setPick(s.id)}
                  disabled={rolling}
                  aria-pressed={pick === s.id}
                  title={s.name}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all ${
                    pick === s.id
                      ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                      : "border-gray-200 bg-white hover:border-purple-300"
                  }`}
                >
                  <KhmerIcon id={s.id} className="w-8 h-8" />
                  <span className="text-[10px] font-medium text-gray-600 leading-none">
                    {s.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Stake */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">2 · Stake</p>
            <div className="grid grid-cols-4 gap-2">
              {KLAKLOK_STAKES.map(value => (
                <button
                  key={value}
                  onClick={() => setStake(value)}
                  disabled={rolling || chips < value}
                  aria-pressed={stake === value}
                  className={`py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-40 ${
                    stake === value
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Roll */}
          <div className="space-y-3">
            {broke ? (
              <Button
                onClick={() => {
                  setChips(STARTING_CHIPS);
                  setResult(null);
                }}
                className="w-full btn-primary text-lg py-6"
              >
                Out of chips — top up to {STARTING_CHIPS}
              </Button>
            ) : (
              <Button
                onClick={doRoll}
                disabled={!canRoll}
                className="w-full btn-primary text-lg py-6"
              >
                {rolling
                  ? "Rolling…"
                  : pick
                    ? `Roll — stake ${stake} on ${getKlaklokSymbol(pick)?.name}`
                    : "Pick a symbol to roll"}
              </Button>
            )}
            <p className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Smartphone className="w-4 h-4" />
              {isListening
                ? "Shake your phone to roll!"
                : motionSupported()
                  ? "Tap Roll, or enable motion to shake."
                  : "Tap Roll to play."}
            </p>
            {!isListening && motionSupported() && (
              <button
                onClick={start}
                className="text-sm font-semibold text-purple-600 underline"
              >
                Enable shake-to-roll
              </button>
            )}
            {error && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                {error}
              </p>
            )}
          </div>
        </Card>

        {/* Payout guide */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">
            How it pays
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-lg font-bold text-green-600">1×</div>
              <div className="text-xs text-gray-500">your symbol once</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-lg font-bold text-green-600">2×</div>
              <div className="text-xs text-gray-500">a pair</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="text-lg font-bold text-amber-600">3×</div>
              <div className="text-xs text-gray-500">three of a kind</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">
            No match loses your stake. Six symbols: Tiger · Gourd · Shrimp · Fish
            · Rooster · Crab.
          </p>
        </Card>

        {/* My stats */}
        {stats && (
          <Card className="p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div
                  className={`text-2xl font-bold ${
                    stats.totalScore >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {stats.totalScore >= 0 ? "+" : ""}
                  {stats.totalScore}
                </div>
                <div className="text-xs text-gray-500">Winnings</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.bestScore}
                </div>
                <div className="text-xs text-gray-500">Best win</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.jackpots}
                </div>
                <div className="text-xs text-gray-500">Triples</div>
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="p-6 space-y-3">
          <h3 className="heading-md flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            Top Winners
          </h3>
          {leaderboard && leaderboard.length > 0 ? (
            <ol className="space-y-1">
              {leaderboard.map((entry, i) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 font-bold text-purple-600">{i + 1}</span>
                    <span className="truncate max-w-[160px]">
                      {entry.playerName || "Player"}
                    </span>
                  </span>
                  <span className="font-semibold text-gray-700 tabular-nums">
                    {entry.totalScore >= 0 ? "+" : ""}
                    {entry.totalScore} chips
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-center text-sm text-gray-500">
              No bets yet — be the first!
            </p>
          )}
          {myStats && !myStats.identified && (
            <p className="text-xs text-gray-400 text-center">
              Open inside Telegram (or sign in) to save winnings and rank.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
