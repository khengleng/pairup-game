import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTelegramInitData } from "@/lib/telegram";
import { useShakeDetector, motionSupported } from "@/lib/useShakeDetector";
import { KhmerIcon } from "@/lib/khmerIcons";
import { KLAKLOK_SYMBOLS, getKlaklokSymbol } from "@shared/shakeLogic";
import { toast } from "sonner";
import { Smartphone, Trophy } from "lucide-react";

const SYMBOL_IDS = KLAKLOK_SYMBOLS.map(s => s.id);
const randomSymbol = () =>
  SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)];

function SymbolTile({
  id,
  highlighted,
  rolling,
}: {
  id: string;
  highlighted: boolean;
  rolling: boolean;
}) {
  const symbol = getKlaklokSymbol(id);
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 w-24 h-28 sm:w-28 sm:h-32 rounded-2xl border-2 p-2 transition-all ${
        rolling ? "animate-bounce" : ""
      } ${
        highlighted
          ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300"
          : "bg-white border-purple-200"
      }`}
    >
      <KhmerIcon id={id} className="w-14 h-14 sm:w-16 sm:h-16" />
      <span className="text-xs font-semibold text-gray-700">
        {symbol?.name}
      </span>
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

  const [symbols, setSymbols] = useState<string[]>([
    SYMBOL_IDS[0],
    SYMBOL_IDS[1],
    SYMBOL_IDS[2],
  ]);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<{
    match: "triple" | "pair" | "single";
    score: number;
  } | null>(null);
  const rollingRef = useRef(false);

  const doRoll = async () => {
    if (rollingRef.current) return;
    rollingRef.current = true;
    setRolling(true);
    setResult(null);

    const tumble = setInterval(() => {
      setSymbols([randomSymbol(), randomSymbol(), randomSymbol()]);
    }, 90);

    try {
      const res = await rollMutation.mutateAsync({ initData });
      await new Promise(r => setTimeout(r, 600));
      clearInterval(tumble);
      setSymbols(res.roll.symbols);
      setResult({ match: res.roll.match, score: res.roll.score });
      if (res.roll.match === "triple") {
        const name = getKlaklokSymbol(res.roll.symbols[0])?.name ?? "";
        toast.success(`🎉 Three ${name}s! +${res.roll.score} points!`);
      } else if (res.roll.match === "pair") {
        toast.success(`Nice — a pair! +${res.roll.score}`);
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

  useEffect(() => {
    if (motionSupported()) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which tiles to highlight: those sharing the winning symbol.
  const counts = symbols.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const highlight = (s: string) => !!result && (counts[s] ?? 0) >= 2;

  const stats = myStats?.stats;

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
              <p className="text-xs text-gray-500 -mt-0.5">ខ្លាឃ្លោក · shake to roll</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Back
          </Button>
        </div>

        {/* Roll area */}
        <Card className="p-6 sm:p-8 text-center space-y-6">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {symbols.map((s, i) => (
              <SymbolTile
                key={i}
                id={s}
                rolling={rolling}
                highlighted={highlight(s)}
              />
            ))}
          </div>

          <div className="h-8">
            {result && (
              <p className="text-2xl font-bold text-purple-600">
                {result.match === "triple"
                  ? "Three of a kind!"
                  : result.match === "pair"
                    ? "A pair!"
                    : "No match"}{" "}
                <span className="text-green-600">+{result.score}</span>
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={doRoll}
              disabled={rolling}
              className="w-full btn-primary text-lg py-6"
            >
              {rolling ? "Rolling…" : "Roll"}
            </Button>
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

        {/* Symbol legend */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">
            The six symbols
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {KLAKLOK_SYMBOLS.map(s => (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <KhmerIcon id={s.id} className="w-10 h-10" />
                <span className="text-[11px] font-medium text-gray-600">
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* My stats */}
        {stats && (
          <Card className="p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.bestScore}
                </div>
                <div className="text-xs text-gray-500">Best roll</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.totalRolls}
                </div>
                <div className="text-xs text-gray-500">Rolls</div>
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
            Top Players
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
                  <span className="font-semibold text-gray-700">
                    {entry.jackpots} triples
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-center text-sm text-gray-500">
              No rolls yet — be the first!
            </p>
          )}
          {myStats && !myStats.identified && (
            <p className="text-xs text-gray-400 text-center">
              Open inside Telegram (or sign in) to save rolls and rank.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
