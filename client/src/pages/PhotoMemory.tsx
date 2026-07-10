import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTelegramBackButton } from "@/lib/telegramUi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ImagePlus, Clock, Zap, X, Shuffle, Images } from "lucide-react";

const MAX_PAIRS = 24;
const MIN_PAIRS = 2;
const TILE_PX = 320; // square crop size stored per photo

type PhotoCard = {
  pairId: number;
  src: string;
  isFlipped: boolean;
  isMatched: boolean;
};

/** Center-crop + downscale a File to a square data URL so tiles are uniform. */
function fileToSquareDataUrl(file: File, size = TILE_PX): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("no canvas"));
        return;
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PhotoMemory() {
  const [, setLocation] = useLocation();
  useTelegramBackButton(() => setLocation("/"));
  const fileRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const [cards, setCards] = useState<PhotoCard[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);

  const won = cards.length > 0 && matched.length === cards.length;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProcessing(true);
    try {
      const room = MAX_PAIRS - photos.length;
      const picked = Array.from(files)
        .filter(f => f.type.startsWith("image/"))
        .slice(0, Math.max(0, room));
      if (picked.length === 0) {
        toast.error(`You can use up to ${MAX_PAIRS} photos.`);
        return;
      }
      const urls = await Promise.all(picked.map(f => fileToSquareDataUrl(f)));
      setPhotos(prev => [...prev, ...urls]);
    } catch {
      toast.error("Couldn't read one of those images. Try another.");
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = (idx: number) =>
    setPhotos(prev => prev.filter((_, i) => i !== idx));

  const buildDeck = useCallback((srcs: string[]) => {
    const deck = shuffle(
      srcs.flatMap((src, pairId) => [
        { pairId, src, isFlipped: false, isMatched: false },
        { pairId, src, isFlipped: false, isMatched: false },
      ])
    );
    setCards(deck);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setSeconds(0);
  }, []);

  const startGame = () => {
    if (photos.length < MIN_PAIRS) {
      toast.error(`Add at least ${MIN_PAIRS} photos to play.`);
      return;
    }
    buildDeck(photos);
    setPhase("playing");
  };

  // Timer while playing and not yet won.
  useEffect(() => {
    if (phase !== "playing" || won) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, won]);

  // Resolve a pair of flipped cards.
  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped;
    setMoves(m => m + 1);
    if (cards[a].pairId === cards[b].pairId) {
      setMatched(prev => [...prev, a, b]);
      setFlipped([]);
    } else {
      const t = setTimeout(() => setFlipped([]), 900);
      return () => clearTimeout(t);
    }
  }, [flipped, cards]);

  const handleCardClick = (idx: number) => {
    if (
      won ||
      flipped.length === 2 ||
      flipped.includes(idx) ||
      matched.includes(idx)
    )
      return;
    setFlipped(prev => [...prev, idx]);
  };

  const cols = Math.ceil(Math.sqrt(cards.length));
  const matchedPairs = matched.length / 2;
  const totalPairs = cards.length / 2;

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <Images className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">My Photos</h1>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              phase === "playing" ? setPhase("setup") : setLocation("/")
            }
          >
            {phase === "playing" ? "Edit photos" : "Back"}
          </Button>
        </div>

        {phase === "setup" ? (
          <>
            <Card className="p-6 sm:p-8 space-y-5">
              <div className="text-center space-y-1">
                <h2 className="heading-md">Play with your own pictures</h2>
                <p className="text-gray-600">
                  Add {MIN_PAIRS}–{MAX_PAIRS} photos — each one becomes a matching
                  pair. Everything stays on your device.
                </p>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={processing || photos.length >= MAX_PAIRS}
                className="w-full btn-primary flex items-center justify-center gap-2 py-6"
              >
                <ImagePlus className="w-5 h-5" />
                {processing ? "Adding…" : "Add photos"}
              </Button>

              {photos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">
                      {photos.length} photo{photos.length === 1 ? "" : "s"} · {photos.length}{" "}
                      pairs
                    </p>
                    <button
                      onClick={() => setPhotos([])}
                      className="text-sm text-gray-500 underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {photos.map((src, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-lg overflow-hidden border border-purple-200 group"
                      >
                        <img
                          src={src}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removePhoto(i)}
                          aria-label={`Remove photo ${i + 1}`}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={startGame}
                disabled={photos.length < MIN_PAIRS}
                className="w-full btn-primary text-lg py-6"
              >
                {photos.length < MIN_PAIRS
                  ? `Add ${MIN_PAIRS - photos.length} more to start`
                  : `Play with ${photos.length} pairs`}
              </Button>
            </Card>
          </>
        ) : (
          <>
            {/* Game stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-gray-600">Moves</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">{moves}</p>
              </Card>
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-gray-600">Time</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
                </p>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs font-semibold text-gray-600 mb-1">Pairs</div>
                <p className="text-2xl font-bold text-purple-600">
                  {matchedPairs}/{totalPairs}
                </p>
              </Card>
            </div>

            {/* Board */}
            <div className="bg-white rounded-xl shadow-lg p-2 sm:p-4">
              <div
                className="grid gap-1.5 sm:gap-2.5 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  maxWidth: cols <= 4 ? 460 : cols <= 6 ? 620 : 760,
                }}
              >
                {cards.map((card, idx) => {
                  const revealed =
                    flipped.includes(idx) || matched.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleCardClick(idx)}
                      disabled={won || flipped.length === 2 || matched.includes(idx)}
                      aria-label={revealed ? "Revealed photo" : "Hidden card"}
                      className={`relative aspect-square rounded-lg overflow-hidden transition-all duration-300 cursor-pointer border-2 ${
                        matched.includes(idx)
                          ? "border-green-300 ring-2 ring-green-200"
                          : revealed
                            ? "border-purple-400"
                            : "border-purple-500 bg-gradient-to-br from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600"
                      }`}
                    >
                      {revealed ? (
                        <img
                          src={card.src}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-white/80 text-lg font-bold">
                          ?
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => buildDeck(photos)}
                className="flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                Restart
              </Button>
            </div>
          </>
        )}

        {/* Win modal */}
        {won && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="p-8 max-w-md w-full text-center space-y-6">
              <div className="space-y-2">
                <h2 className="heading-md">🎉 You matched them all!</h2>
                <p className="text-gray-600">Your photos, your victory.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Moves</p>
                  <p className="text-2xl font-bold text-purple-600">{moves}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Time</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.floor(seconds / 60)}:
                    {String(seconds % 60).padStart(2, "0")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => buildDeck(photos)}
                  className="flex-1 btn-primary"
                >
                  Play again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPhase("setup")}
                  className="flex-1"
                >
                  New photos
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
