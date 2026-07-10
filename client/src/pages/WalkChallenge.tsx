import { useState } from "react";
import { useLocation } from "wouter";
import { useTelegramBackButton } from "@/lib/telegramUi";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTelegramInitData } from "@/lib/telegram";
import { useStepCounter } from "@/lib/useStepCounter";
import { toast } from "sonner";
import { Footprints, Flame, Play, Square, Trophy } from "lucide-react";

export default function WalkChallenge() {
  const [, setLocation] = useLocation();
  useTelegramBackButton(() => setLocation("/"));
  const initData = getTelegramInitData();
  const utils = trpc.useUtils();

  const { data: today } = trpc.walk.getToday.useQuery({ initData });
  const { data: leaderboard } = trpc.walk.getLeaderboard.useQuery({ limit: 10 });
  const startMutation = trpc.walk.start.useMutation();
  const completeMutation = trpc.walk.complete.useMutation();

  const { steps, isCounting, error, start, stop } = useStepCounter();
  const [sessionId, setSessionId] = useState<number | null>(null);

  const goal = today?.goal ?? 6000;
  const todaySteps = today?.steps ?? 0;
  const liveTotal = todaySteps + (isCounting ? steps : 0);
  const progress = Math.min(100, Math.round((liveTotal / goal) * 100));

  const handleStart = async () => {
    try {
      const res = await startMutation.mutateAsync({ initData });
      setSessionId(res.sessionId);
      await start();
    } catch {
      toast.error("Could not start the walk. Please try again.");
    }
  };

  const handleFinish = async () => {
    stop();
    const walked = steps;
    if (sessionId === null) return;
    try {
      const res = await completeMutation.mutateAsync({
        sessionId,
        steps: walked,
        initData,
      });
      if (res.goalMet) {
        toast.success(`🎉 Goal reached! ${res.total.toLocaleString()} steps today.`);
      } else {
        toast.success(`+${walked.toLocaleString()} steps recorded.`);
      }
      await Promise.all([
        utils.walk.getToday.invalidate(),
        utils.walk.getLeaderboard.invalidate(),
      ]);
    } catch {
      toast.error("Could not save your steps.");
    } finally {
      setSessionId(null);
    }
  };

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <Footprints className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Walking Challenge</h1>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Back
          </Button>
        </div>

        {/* Progress */}
        <Card className="p-8 text-center space-y-5">
          {today && today.streak > 0 && (
            <div className="inline-flex items-center gap-1 text-purple-600 font-semibold">
              <Flame className="w-5 h-5" />
              {today.streak}-day streak
            </div>
          )}

          <div>
            <div className="text-5xl font-bold text-purple-600">
              {liveTotal.toLocaleString()}
            </div>
            <div className="text-gray-500 mt-1">
              of {goal.toLocaleString()} steps today
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-green-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {today?.goalMet && !isCounting && (
            <p className="text-green-600 font-semibold">
              ✅ Daily goal reached — nice work!
            </p>
          )}

          {isCounting ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Counting… keep the app open and walk. This session:{" "}
                <span className="font-semibold">{steps}</span> steps
              </p>
              <Button
                onClick={handleFinish}
                disabled={completeMutation.isPending}
                className="w-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
              >
                <Square className="w-5 h-5" />
                Finish & Save
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleStart}
              disabled={startMutation.isPending}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Walk
            </Button>
          )}

          {error && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {error}
            </p>
          )}

          {!today?.identified && (
            <p className="text-xs text-gray-400">
              Open inside Telegram (or sign in) to save steps and rank on the
              leaderboard.
            </p>
          )}
        </Card>

        {/* Leaderboard */}
        <Card className="p-6 space-y-3">
          <h3 className="heading-md flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            Today's Step Leaders
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
                      {entry.playerName || "Walker"}
                    </span>
                  </span>
                  <span className="font-semibold text-gray-700">
                    {entry.steps.toLocaleString()} steps
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Be the first to log steps today!
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
