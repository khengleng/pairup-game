import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GAME_THEMES,
  GRID_SIZE_OPTIONS,
  GRID_SIZES,
  getThemeById,
} from "@shared/gameConfig";
import { Trophy, Medal } from "lucide-react";

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const [selectedThemeId, setSelectedThemeId] = useState<string>(
    GAME_THEMES[0]?.id ?? ""
  );
  const [selectedGridSize, setSelectedGridSize] =
    useState<keyof typeof GRID_SIZES>("easy");
  const selectedTheme = getThemeById(selectedThemeId) ?? GAME_THEMES[0];

  const { data: leaderboard, isLoading } =
    trpc.leaderboard.getByThemeAndSize.useQuery(
      {
        theme: selectedTheme?.name ?? "",
        gridSize: GRID_SIZES[selectedGridSize],
        limit: 50,
      },
      {
        enabled: !!selectedTheme,
      }
    );

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
            Back to Home
          </Button>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h2 className="heading-lg mb-2">🏆 Global Leaderboard</h2>
          <p className="text-gray-600">
            See how you rank against other players
          </p>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-8">
          <div className="space-y-6">
            {/* Theme Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Theme
              </label>
              <Tabs value={selectedThemeId} onValueChange={setSelectedThemeId}>
                <TabsList
                  className="grid w-full"
                  style={{
                    gridTemplateColumns: `repeat(${GAME_THEMES.length}, minmax(0, 1fr))`,
                  }}
                >
                  {GAME_THEMES.map(theme => (
                    <TabsTrigger key={theme.id} value={theme.id}>
                      {theme.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Difficulty Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {GRID_SIZE_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() =>
                      setSelectedGridSize(id as keyof typeof GRID_SIZES)
                    }
                    className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                      selectedGridSize === id
                        ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <div className="text-sm capitalize">{id}</div>
                    <div className="text-xs opacity-75">{label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Leaderboard Table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading leaderboard...</p>
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-50 to-green-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Player
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Best Moves
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Best Time
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Total Score
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Games
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-gray-200 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-purple-50`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <Trophy className="w-5 h-5 text-yellow-500" />
                          )}
                          {idx === 1 && (
                            <Medal className="w-5 h-5 text-gray-400" />
                          )}
                          {idx === 2 && (
                            <Medal className="w-5 h-5 text-orange-600" />
                          )}
                          <span className="font-bold text-gray-900">
                            #{idx + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {entry.playerName || "Anonymous"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {entry.bestMoves}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {Math.floor(entry.bestTimeSeconds / 60)}:
                        {String(entry.bestTimeSeconds % 60).padStart(2, "0")}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 bg-gradient-to-r from-purple-100 to-green-100 text-purple-700 rounded-full font-bold">
                          {entry.bestScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {entry.gamesPlayed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">
                No scores yet for this combination
              </p>
              <Button onClick={() => setLocation("/")} className="btn-primary">
                Be the First to Play
              </Button>
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Button onClick={() => setLocation("/")} className="btn-primary">
            Play Now & Climb the Leaderboard
          </Button>
        </div>
      </div>
    </div>
  );
}
