import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { POST_LOGIN_REDIRECT_KEY } from "@/const";
import { getTelegramInitData, isTelegramMiniApp, getStartParam } from "@/lib/telegram";
import { GAME_THEMES, GRID_SIZE_OPTIONS, GRID_SIZES } from "@shared/gameConfig";
import { BRAND } from "@shared/brand";
import { KhmerIcon } from "@/lib/khmerIcons";
import type { GameId } from "@shared/games";
import {
  Flame,
  Footprints,
  ChevronRight,
  Dice5,
  Images,
  Ticket,
  LayoutGrid,
  Gamepad2,
  Coins,
} from "lucide-react";
import type { ReactNode } from "react";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedThemeId, setSelectedThemeId] = useState<string>(
    GAME_THEMES[0]?.id ?? ""
  );
  const [selectedGridSize, setSelectedGridSize] =
    useState<keyof typeof GRID_SIZES>("easy");
  const [isStarting, setIsStarting] = useState(false);

  const { data: configuredThemes } = trpc.gameConfig.getThemes.useQuery();
  const { data: gamesList } = trpc.games.getEnabled.useQuery();
  const createGameMutation = trpc.game.createGame.useMutation();

  const isGameEnabled = (id: GameId) =>
    gamesList?.find(g => g.id === id)?.enabled ?? true;

  const gameIcons: Record<GameId, ReactNode> = {
    memory: <LayoutGrid className="w-6 h-6 text-white" />,
    photos: <Images className="w-6 h-6 text-white" />,
    dice: <Dice5 className="w-6 h-6 text-white" />,
    klaklok: <KhmerIcon id="tiger" className="w-7 h-7" />,
    scratch: <Ticket className="w-6 h-6 text-white" />,
    walk: <Footprints className="w-6 h-6 text-white" />,
  };

  const themes =
    configuredThemes && configuredThemes.length > 0
      ? configuredThemes
      : GAME_THEMES;
  const selectedTheme =
    themes.find(theme => theme.id === selectedThemeId) ?? themes[0];

  const initData = getTelegramInitData();
  const { data: dailyChallenge } = trpc.daily.getChallenge.useQuery();
  const { data: dailyStatus } = trpc.daily.getMyStatus.useQuery({ initData });
  const { data: wallet } = trpc.rewards.getWallet.useQuery({ initData });
  const claimReferral = trpc.rewards.claimReferral.useMutation();
  const [isStartingDaily, setIsStartingDaily] = useState(false);

  const handlePlayDaily = async () => {
    if (!dailyChallenge) return;
    setIsStartingDaily(true);
    try {
      const result = await createGameMutation.mutateAsync({
        theme: dailyChallenge.theme,
        gridSize: dailyChallenge.gridSize,
      });
      setLocation(`/game/${result.gameId}?daily=1`);
    } catch (error) {
      console.error("Failed to start daily challenge:", error);
      setIsStartingDaily(false);
    }
  };

  const handleStartGame = async () => {
    if (!selectedTheme) return;
    setIsStarting(true);
    try {
      const result = await createGameMutation.mutateAsync({
        theme: selectedTheme.name,
        gridSize: GRID_SIZES[selectedGridSize],
      });
      setLocation(`/game/${result.gameId}`);
    } catch (error) {
      console.error("Failed to start game:", error);
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const redirectPath = localStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    if (!redirectPath) return;
    localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    setLocation(redirectPath);
  }, [setLocation, user]);

  // Referral: if opened via an invite link (?startapp=ref<id>), link + reward.
  useEffect(() => {
    const m = getStartParam()?.match(/^ref(\d+)$/);
    if (m) claimReferral.mutate({ referrerId: parseInt(m[1], 10), initData });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memoryEnabled = isGameEnabled("memory");
  const otherGames = (gamesList ?? []).filter(
    g => g.id !== "memory" && g.enabled
  );

  return (
    <div className="min-h-screen pairup-gradient pb-10">
      {/* Top bar */}
      <nav className="bg-white/90 backdrop-blur border-b border-purple-100 sticky top-0 z-10">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">{BRAND}</h1>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:inline text-sm text-gray-600">
                Hi, {user.name}
              </span>
            )}
            {!isTelegramMiniApp() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/setup")}
              >
                Admin
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="container pt-5 space-y-5 max-w-2xl">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pick a game</h2>
          <p className="text-sm text-gray-500">Tap to play — no sign-up needed.</p>
        </div>

        {/* Rewards wallet */}
        <button
          onClick={() => setLocation("/wallet")}
          className="w-full flex items-center justify-between gap-3 rounded-xl bg-white border border-purple-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 tabular-nums">
                {(wallet?.points ?? 0).toLocaleString()} points
              </p>
              <p className="text-xs text-gray-500">Earn as you play · invite friends for +200</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Daily challenge (memory) */}
        {dailyChallenge && memoryEnabled && (
          <Card className="p-4 bg-gradient-to-r from-purple-600 to-green-500 text-white border-0 shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-90">
                  <Flame className="w-4 h-4" />
                  Daily Challenge
                </div>
                <p className="font-bold truncate">
                  {dailyChallenge.theme} · {dailyChallenge.gridSize}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {dailyStatus && dailyStatus.streak > 0 && (
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-lg font-bold">
                      <Flame className="w-4 h-4" />
                      {dailyStatus.streak}
                    </div>
                    <div className="text-[10px] opacity-90">streak</div>
                  </div>
                )}
                <Button
                  onClick={handlePlayDaily}
                  disabled={isStartingDaily || createGameMutation.isPending}
                  size="sm"
                  className="bg-white text-purple-700 hover:bg-purple-50 font-semibold"
                >
                  {dailyStatus?.playedToday ? "Replay" : "Play"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Games grid */}
        {otherGames.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {otherGames.map(g => (
              <button
                key={g.id}
                onClick={() => setLocation(g.path)}
                className="text-left bg-white rounded-xl border border-purple-100 p-4 hover:shadow-md hover:border-purple-300 transition-all active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center mb-2">
                  {gameIcons[g.id]}
                </div>
                <p className="font-bold text-gray-900 leading-tight">{g.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {g.description}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Memory Match quick setup */}
        {memoryEnabled && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 leading-tight">
                  Memory Match
                </h3>
                <p className="text-xs text-gray-500">
                  Flip cards, find the pairs.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Theme
              </label>
              <Tabs value={selectedThemeId} onValueChange={setSelectedThemeId}>
                <TabsList
                  className="grid w-full"
                  style={{
                    gridTemplateColumns: `repeat(${themes.length}, minmax(0, 1fr))`,
                  }}
                >
                  {themes.map(theme => (
                    <TabsTrigger key={theme.id} value={theme.id} className="text-xs">
                      {theme.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {GRID_SIZE_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() =>
                      setSelectedGridSize(id as keyof typeof GRID_SIZES)
                    }
                    className={`py-2 rounded-lg font-semibold transition-all ${
                      selectedGridSize === id
                        ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <div className="text-sm capitalize">{id}</div>
                    <div className="text-[10px] opacity-75">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleStartGame}
              disabled={!selectedTheme || isStarting || createGameMutation.isPending}
              className="w-full btn-primary py-5 text-base"
            >
              {isStarting || createGameMutation.isPending ? "Starting…" : "Play Memory Match"}
            </Button>
          </Card>
        )}

        <p className="text-center text-xs text-gray-400 pt-2">
          {BRAND} · play, compete, win
        </p>
      </div>
    </div>
  );
}
