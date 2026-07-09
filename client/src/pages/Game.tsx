import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createShuffledDeck,
  createSeededDeck,
  dailyDeckSeed,
  getDailyDateKey,
  GAME_THEMES,
  GRID_DIMENSIONS,
} from "@shared/gameConfig";
import { getTelegramInitData } from "@/lib/telegram";
import { KhmerIcon } from "@/lib/khmerIcons";
import { Clock, Zap } from "lucide-react";

interface GameCard {
  pairId: number;
  text: string;
  icon?: string;
  isMatch: boolean;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function Game() {
  const [, setLocation] = useLocation();
  const gameIdStr = window.location.pathname.split("/").pop();
  const gameId = gameIdStr ? parseInt(gameIdStr, 10) : null;
  const isDaily = new URLSearchParams(window.location.search).get("daily") === "1";

  const { data: game, isLoading } = trpc.game.getGame.useQuery(gameId || 0, {
    enabled: !!gameId,
  });
  const { data: configuredThemes } = trpc.gameConfig.getThemes.useQuery();

  const completeGameMutation = trpc.game.completeGame.useMutation();

  const [cards, setCards] = useState<GameCard[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  // Initialize game
  useEffect(() => {
    if (!game) return;

    const themes =
      configuredThemes && configuredThemes.length > 0
        ? configuredThemes
        : GAME_THEMES;
    const themePairs = themes.find(theme => theme.name === game.theme)?.pairs;
    const dimensions = GRID_DIMENSIONS[game.gridSize];
    if (!themePairs || !dimensions) return;

    const pairs = themePairs.slice(0, dimensions.total / 2);
    // Daily challenge uses a deterministic seed so everyone gets the same board.
    const deck = isDaily
      ? createSeededDeck(
          pairs,
          dailyDeckSeed(
            getDailyDateKey(new Date()),
            game.theme,
            game.gridSize
          )
        )
      : createShuffledDeck(pairs);
    const gameCards: GameCard[] = deck.map((card, idx) => ({
      ...card,
      isFlipped: false,
      isMatched: false,
    }));
    setCards(gameCards);
    setGameStarted(true);
  }, [game, configuredThemes]);

  // Timer
  useEffect(() => {
    if (!gameStarted || gameCompleted) return;

    const timer = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameCompleted]);

  // Check for matches
  useEffect(() => {
    if (flipped.length !== 2) return;

    const [idx1, idx2] = flipped;
    const card1 = cards[idx1];
    const card2 = cards[idx2];

    if (card1.pairId === card2.pairId) {
      // Match found
      setMatched(prev => [...prev, idx1, idx2]);
      setFlipped([]);
      setMoves(m => m + 1);

      // Check if game is complete
      if (matched.length + 2 === cards.length) {
        setGameCompleted(true);
      }
    } else {
      // No match - flip back after delay
      setTimeout(() => {
        setFlipped([]);
        setMoves(m => m + 1);
      }, 1000);
    }
  }, [flipped, cards, matched]);

  const handleCardClick = useCallback(
    (idx: number) => {
      if (
        gameCompleted ||
        flipped.length === 2 ||
        flipped.includes(idx) ||
        matched.includes(idx)
      ) {
        return;
      }
      setFlipped(prev => [...prev, idx]);
    },
    [flipped, matched, gameCompleted]
  );

  const handleGameComplete = async () => {
    if (!gameId) return;

    try {
      // The server validates and normalizes the score; use its authoritative
      // values so the completion screen matches what was recorded.
      const result = await completeGameMutation.mutateAsync({
        gameId,
        moves,
        timeSeconds: seconds,
        initData: getTelegramInitData(),
        daily: isDaily,
      });
      const dailyParam = isDaily ? "&daily=1" : "";
      const streakParam = result.daily
        ? `&streak=${result.daily.streak}`
        : "";
      setLocation(
        `/completion/${gameId}?moves=${result.moves}&time=${result.timeSeconds}${dailyParam}${streakParam}`
      );
    } catch (error) {
      console.error("Failed to complete game:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-green-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Game not found</p>
          <Button onClick={() => setLocation("/")} className="btn-primary">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const gridClassMap: Record<string, string> = {
    "4x4": "grid-cols-4",
    "6x6": "grid-cols-6",
    "8x8": "grid-cols-8",
  };
  const gridClass = gridClassMap[game.gridSize] || "grid-cols-4";

  // Scale text with grid density so definitions stay readable on small screens.
  const cardTextClass =
    game.gridSize === "8x8"
      ? "text-[9px] leading-tight sm:text-xs"
      : game.gridSize === "6x6"
        ? "text-[11px] leading-tight sm:text-sm"
        : "text-sm leading-snug sm:text-base";

  const totalPairs = cards.length / 2;
  const matchedPairs = matched.length / 2;
  const progress = totalPairs > 0 ? (matchedPairs / totalPairs) * 100 : 0;

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PairUp</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="btn-outline"
          >
            Exit Game
          </Button>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-semibold text-gray-600">Moves</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{moves}</p>
          </Card>

          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-gray-600">Time</span>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </p>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-sm font-semibold text-gray-600 mb-2">
              Progress
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {matchedPairs}/{totalPairs}
            </p>
          </Card>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Pairs Matched
            </span>
            <span className="text-sm font-semibold text-gray-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-green-400 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Game Board */}
        <div className="bg-white rounded-xl shadow-lg p-2 sm:p-6 mb-8">
          <div className={`grid ${gridClass} gap-1.5 sm:gap-3`}>
            {cards.map((card, idx) => {
              const isMatched = matched.includes(idx);
              const isFlipped = flipped.includes(idx);
              const revealed = isMatched || isFlipped;
              const isImage = !!card.icon;
              // Revealed image cards use a light face so the coloured icon
              // reads; revealed word cards keep the purple/green treatment.
              const faceClass = isMatched
                ? "bg-gradient-to-br from-purple-100 to-green-50 border-2 border-green-300 text-gray-900"
                : isFlipped
                  ? isImage
                    ? "bg-amber-50 border-2 border-purple-400 text-gray-900"
                    : "bg-gradient-to-br from-purple-500 to-purple-600 text-white border-2 border-purple-600"
                  : "bg-gradient-to-br from-purple-400 to-purple-500 text-white border-2 border-purple-500 hover:from-purple-500 hover:to-purple-600";
              return (
                <button
                  key={idx}
                  onClick={() => handleCardClick(idx)}
                  disabled={gameCompleted || flipped.length === 2 || isMatched}
                  aria-label={revealed ? card.text : "Hidden card"}
                  className={`aspect-square rounded-lg font-semibold text-center flex flex-col items-center justify-center p-1 overflow-hidden transition-all duration-300 cursor-pointer ${faceClass}`}
                >
                  {isImage ? (
                    <span
                      className={`flex flex-col items-center justify-center w-full h-full transition-all ${
                        revealed ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <KhmerIcon
                        id={card.icon!}
                        className={
                          game.gridSize === "8x8"
                            ? "w-[86%] h-[86%]"
                            : "w-3/4 h-3/4"
                        }
                      />
                      {game.gridSize !== "8x8" && (
                        <span className={`${cardTextClass} leading-none mt-0.5`}>
                          {card.text}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span
                      className={`${cardTextClass} w-full break-words hyphens-auto transition-all ${
                        revealed ? "opacity-100" : "opacity-0"
                      }`}
                      lang="en"
                    >
                      {card.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Game Complete Modal */}
        {gameCompleted && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-8 max-w-md w-full mx-4 text-center space-y-6">
              <div className="space-y-2">
                <h2 className="heading-md">🎉 You Won!</h2>
                <p className="text-gray-600">
                  Congratulations on completing the puzzle!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Moves</p>
                  <p className="text-2xl font-bold text-purple-600">{moves}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Time Taken</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.floor(seconds / 60)}:
                    {String(seconds % 60).padStart(2, "0")}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleGameComplete}
                disabled={completeGameMutation.isPending}
                className="w-full btn-primary"
              >
                {completeGameMutation.isPending ? "Processing..." : "Continue"}
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
