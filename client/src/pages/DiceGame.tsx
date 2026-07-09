import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTelegramInitData } from "@/lib/telegram";
import { useShakeDetector, motionSupported } from "@/lib/useShakeDetector";
import { toast } from "sonner";
import { Dice5, Smartphone, Trophy } from "lucide-react";

/** A single pip layout per die value (positions on a 3×3 grid). */
const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const pips = PIP_LAYOUT[value] ?? [];
  return (
    <div
      className={`grid grid-cols-3 grid-rows-3 gap-1 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-purple-200 shadow-md p-2.5 transition-transform ${
        rolling ? "animate-bounce" : ""
      }`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full ${
            pips.includes(i) ? "bg-purple-600" : "bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}

export default function DiceGame() {
  const [, setLocation] = useLocation();
  const initData = getTelegramInitData();
  const utils = trpc.useUtils();

  const rollMutation = trpc.shake.rollDice.useMutation();
  const { data: myStats } = trpc.shake.getMyStats.useQuery({
    game: "dice",
    initData,
  });
  const { data: leaderboard } = trpc.shake.getLeaderboard.useQuery({
    game: "dice",
    limit: 10,
  });

  const [dice, setDice] = useState<number[]>([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [lastTotal, setLastTotal] = useState<number | null>(null);
  const rollingRef = useRef(false);

  const doRoll = async () => {
    if (rollingRef.current) return;
    rollingRef.current = true;
    setRolling(true);
    setLastTotal(null);

    // Tumble the faces locally for feel while the server decides the result.
    const tumble = setInterval(() => {
      setDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
    }, 80);

    try {
      const res = await rollMutation.mutateAsync({ initData });
      await new Promise(r => setTimeout(r, 500));
      clearInterval(tumble);
      setDice(res.roll.dice);
      setLastTotal(res.roll.total);
      if (res.roll.isDoubles) {
        toast.success(`🎲 Doubles! You rolled ${res.roll.total}.`);
      }
      await Promise.all([
        utils.shake.getMyStats.invalidate({ game: "dice" }),
        utils.shake.getLeaderboard.invalidate({ game: "dice" }),
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

  // Start listening for shakes on mount where supported; clean up on unmount.
  useEffect(() => {
    if (motionSupported()) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = myStats?.stats;

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <Dice5 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Shake Dice</h1>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Back
          </Button>
        </div>

        {/* Roll area */}
        <Card className="p-8 text-center space-y-6">
          <div className="flex items-center justify-center gap-4">
            {dice.map((d, i) => (
              <Die key={i} value={d} rolling={rolling} />
            ))}
          </div>

          <div className="h-8">
            {lastTotal !== null && (
              <p className="text-2xl font-bold text-purple-600">
                Total: {lastTotal}
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
                <div className="text-xs text-gray-500">Doubles</div>
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="p-6 space-y-3">
          <h3 className="heading-md flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            Top Rollers
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
                    best {entry.bestScore}
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
