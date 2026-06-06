import { useState } from "react";
import { useLocation } from "wouter";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Twitter, Linkedin, Copy } from "lucide-react";

export default function Completion() {
  const [, setLocation] = useLocation();
  const gameIdStr = window.location.pathname.split("/").pop();
  const gameId = gameIdStr ? parseInt(gameIdStr, 10) : null;
  
  const search = useSearch();
  const params = new URLSearchParams(search);
  const moves = parseInt(params.get("moves") || "0", 10);
  const timeSeconds = parseInt(params.get("time") || "0", 10);
  const totalScore = moves + timeSeconds;

  const { user } = useAuth();
  const { data: game } = trpc.game.getGame.useQuery(gameId || 0, { enabled: !!gameId });
  const { data: personalBest } = trpc.score.getUserBest.useQuery(
    game && user ? { theme: game.theme, gridSize: game.gridSize } : { theme: "Products", gridSize: "4x4" },
    { enabled: !!game && !!user }
  );
  const submitLeadMutation = trpc.lead.submit.useMutation();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    company: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.company) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await submitLeadMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        company: formData.company,
        gameId: gameId || undefined,
        score: totalScore,
        theme: game?.theme,
        gridSize: game?.gridSize,
      });
      setSubmitted(true);
      toast.success("Thank you! Your information has been saved.");
    } catch (error) {
      console.error("Failed to submit lead:", error);
      toast.error("Failed to submit. Please try again.");
    }
  };

  const handleShare = (platform: "twitter" | "linkedin" | "copy") => {
    const scoreMessage = `I just completed PairUp in ${moves} moves and ${Math.floor(timeSeconds / 60)}:${String(timeSeconds % 60).padStart(2, "0")}! Can you beat my score? 🎮`;
    const shareUrl = window.location.origin;

    if (platform === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(scoreMessage)}&url=${encodeURIComponent(shareUrl)}`,
        "_blank"
      );
    } else if (platform === "linkedin") {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(scoreMessage)}`,
        "_blank"
      );
    } else if (platform === "copy") {
      navigator.clipboard.writeText(`${scoreMessage}\n${shareUrl}`);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container max-w-2xl">
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
            Play Again
          </Button>
        </div>

        {/* Celebration Card */}
        <Card className="p-8 text-center space-y-8 mb-8">
          <div className="space-y-2">
            <h2 className="heading-lg">🎉 Congratulations!</h2>
            <p className="text-xl text-gray-600">You've completed the puzzle!</p>
          </div>

          {/* Score Display */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-lg p-6">
              <p className="text-sm font-semibold text-gray-600 mb-2">Moves</p>
              <p className="text-4xl font-bold text-purple-600">{moves}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-6">
              <p className="text-sm font-semibold text-gray-600 mb-2">Time</p>
              <p className="text-4xl font-bold text-green-600">
                {Math.floor(timeSeconds / 60)}:{String(timeSeconds % 60).padStart(2, "0")}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-green-50 rounded-lg p-6">
              <p className="text-sm font-semibold text-gray-600 mb-2">Total Score</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-green-500 bg-clip-text text-transparent">
                {totalScore}
              </p>
            </div>
          </div>

          {/* Theme & Difficulty */}
          {game && (
            <div className="flex justify-center gap-4">
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <p className="text-sm font-semibold text-gray-700">{game.theme}</p>
              </div>
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <p className="text-sm font-semibold text-gray-700">{game.gridSize}</p>
              </div>
            </div>
          )}

          {/* Personal Best */}
          {user && personalBest && (
            <div className="bg-gradient-to-r from-purple-50 to-green-50 rounded-lg p-4 border border-purple-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">YOUR PERSONAL BEST</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Best Moves</p>
                  <p className="text-lg font-bold text-purple-600">{personalBest.bestMoves}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Best Score</p>
                  <p className="text-lg font-bold text-green-600">{personalBest.totalScore}</p>
                </div>
              </div>
              {totalScore < personalBest.totalScore && (
                <p className="text-sm text-green-600 font-semibold mt-2">🎉 New Personal Best!</p>
              )}
            </div>
          )}
        </Card>

        {/* Social Sharing */}
        <Card className="p-8 space-y-6 mb-8">
          <h3 className="heading-md text-center">Share Your Victory</h3>
          <div className="grid grid-cols-3 gap-4">
            <Button
              onClick={() => handleShare("twitter")}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Twitter className="w-5 h-5" />
              <span className="hidden sm:inline">Tweet</span>
            </Button>
            <Button
              onClick={() => handleShare("linkedin")}
              className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white"
            >
              <Linkedin className="w-5 h-5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              onClick={() => handleShare("copy")}
              className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white"
            >
              <Copy className="w-5 h-5" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
          </div>
        </Card>

        {/* Lead Capture Form */}
        {!submitted ? (
          <Card className="p-8 space-y-6">
            <div className="space-y-2">
              <h3 className="heading-md text-center">Enter to Win!</h3>
              <p className="text-center text-gray-600">
                Top scorers qualify for exclusive prizes. Share your details below.
              </p>
            </div>

            <form onSubmit={handleSubmitLead} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  name="company"
                  type="text"
                  placeholder="Your company name"
                  value={formData.company}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitLeadMutation.isPending}
                className="w-full btn-primary"
              >
                {submitLeadMutation.isPending ? "Submitting..." : "Submit & Enter Prize Draw"}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-8 text-center space-y-4">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="heading-md">Thank You!</h3>
            <p className="text-gray-600">
              Your information has been saved. Good luck in the prize draw!
            </p>
            <Button onClick={() => setLocation("/")} className="btn-primary">
              Play Another Round
            </Button>
          </Card>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/leaderboard")}
            className="btn-outline"
          >
            View Leaderboard
          </Button>
          <Button onClick={() => setLocation("/")} className="btn-secondary">
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
