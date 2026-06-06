import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { THEMES, GRID_SIZES } from "@shared/gameConfig";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof THEMES>("Products");
  const [selectedGridSize, setSelectedGridSize] = useState<keyof typeof GRID_SIZES>("easy");
  const [isStarting, setIsStarting] = useState(false);

  const createGameMutation = trpc.game.createGame.useMutation();

  const handleStartGame = async () => {
    setIsStarting(true);
    try {
      const result = await createGameMutation.mutateAsync({
        theme: THEMES[selectedTheme],
        gridSize: GRID_SIZES[selectedGridSize],
      });
      setLocation(`/game/${result.gameId}`);
    } catch (error) {
      console.error("Failed to start game:", error);
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen pairup-gradient">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-purple-200">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-green-500 bg-clip-text text-transparent">
              PairUp
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {user && <span className="text-sm text-gray-600">Welcome, {user.name}</span>}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="heading-lg">Match Your Way to Victory</h2>
              <p className="text-xl text-gray-600">
                Challenge yourself with PairUp, the ultimate memory matching game. Test your skills, climb the leaderboard, and capture amazing prizes!
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Three Exciting Themes</h3>
                  <p className="text-sm text-gray-600">Products, Features, or Team Members</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Multiple Difficulty Levels</h3>
                  <p className="text-sm text-gray-600">Easy (4×4), Medium (6×6), Hard (8×8)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Track Your Best Scores</h3>
                  <p className="text-sm text-gray-600">Personal bests and global leaderboard</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Game Setup Card */}
          <div className="game-card p-8 space-y-6">
            <h3 className="heading-md text-center">Ready to Play?</h3>

            {/* Theme Selector */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">Choose Your Theme</label>
              <Tabs value={selectedTheme} onValueChange={(v) => setSelectedTheme(v as keyof typeof THEMES)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="Products">Products</TabsTrigger>
                  <TabsTrigger value="Features">Features</TabsTrigger>
                  <TabsTrigger value="TeamMembers">Team Members</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-gray-500">
                {selectedTheme === "Products" && "Match product names with their descriptions"}
                {selectedTheme === "Features" && "Match features with their benefits"}
                {selectedTheme === "TeamMembers" && "Match team members with their roles"}
              </p>
            </div>

            {/* Difficulty Selector */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">Select Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(GRID_SIZES).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedGridSize(key as keyof typeof GRID_SIZES)}
                    className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                      selectedGridSize === key
                        ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <div className="text-sm capitalize">{key}</div>
                    <div className="text-xs opacity-75">{label}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {selectedGridSize === "easy" && "16 cards - Perfect for beginners"}
                {selectedGridSize === "medium" && "36 cards - A real challenge"}
                {selectedGridSize === "hard" && "64 cards - For the masters"}
              </p>
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStartGame}
              disabled={isStarting || createGameMutation.isPending}
              className="w-full btn-primary text-lg py-6"
            >
              {isStarting || createGameMutation.isPending ? "Starting..." : "Play Now"}
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white border-t border-purple-200 py-16">
        <div className="container">
          <h2 className="heading-md text-center mb-12">Why PairUp?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎮</span>
              </div>
              <h3 className="font-semibold mb-2">Playful Design</h3>
              <p className="text-sm text-gray-600">
                Enjoy a vibrant, engaging interface with smooth animations and delightful interactions.
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="font-semibold mb-2">Compete & Win</h3>
              <p className="text-sm text-gray-600">
                Climb the leaderboard, earn top scores, and qualify for exclusive prizes.
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold mb-2">Track Progress</h3>
              <p className="text-sm text-gray-600">
                Monitor your personal bests and see how you compare to other players globally.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16 text-center">
        <h2 className="heading-md mb-4">Ready to Test Your Memory?</h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Join thousands of players competing in PairUp. Whether you're a casual player or a competitive gamer, there's a challenge waiting for you.
        </p>
        <Button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="btn-primary"
        >
          Start Playing Now
        </Button>
      </section>
    </div>
  );
}
