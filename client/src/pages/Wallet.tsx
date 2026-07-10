import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTelegramInitData, shareToTelegram } from "@/lib/telegram";
import { useTelegramBackButton } from "@/lib/telegramUi";
import { BRAND } from "@shared/brand";
import { toast } from "sonner";
import { Coins, Gift, Users, Copy, Share2 } from "lucide-react";

const EARN = [
  ["Complete a memory game", "+50"],
  ["Win the daily challenge", "+100"],
  ["Hit your daily step goal", "+100"],
  ["Win a scratch card", "+100"],
  ["Invite a friend (both of you)", "+200"],
];

export default function Wallet() {
  const [, setLocation] = useLocation();
  useTelegramBackButton(() => setLocation("/"));
  const initData = getTelegramInitData();
  const { data: wallet } = trpc.rewards.getWallet.useQuery({ initData });

  const link = wallet?.referralLink ?? "";
  const shareMsg = `Play games and win prizes on ${BRAND}! Join with my link and we both get bonus points 🎁`;

  const invite = () => {
    if (!link) return;
    if (!shareToTelegram(link, shareMsg)) {
      navigator.clipboard?.writeText(link).then(
        () => toast.success("Invite link copied"),
        () => toast.error("Copy failed")
      );
    }
  };
  const copyLink = () => {
    if (!link) return;
    navigator.clipboard?.writeText(link).then(
      () => toast.success("Invite link copied"),
      () => toast.error("Copy failed")
    );
  };

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Rewards</h1>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>Back</Button>
        </div>

        {/* Balance */}
        <Card className="p-6 text-center bg-gradient-to-br from-purple-600 to-green-500 text-white border-0">
          <p className="text-sm opacity-90">Your points</p>
          <p className="text-5xl font-bold tabular-nums">
            {(wallet?.points ?? 0).toLocaleString()}
          </p>
        </Card>

        {/* Invite */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-900">Invite friends</h3>
            {wallet && wallet.referralCount > 0 && (
              <span className="ml-auto text-sm text-gray-500">
                {wallet.referralCount} joined
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Share your link — you both get <b>+200</b> when a friend joins and plays.
          </p>
          {link ? (
            <>
              <div className="flex items-center gap-2">
                <input readOnly value={link}
                  className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 truncate" />
                <button onClick={copyLink} aria-label="Copy" className="text-purple-600">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <Button onClick={invite} className="w-full btn-primary flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" />
                Invite on Telegram
              </Button>
            </>
          ) : (
            <p className="text-xs text-gray-400">
              Open inside Telegram to get your personal invite link.
            </p>
          )}
        </Card>

        {/* How to earn */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-900">How to earn</h3>
          </div>
          <ul className="space-y-1.5">
            {EARN.map(([label, pts]) => (
              <li key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{label}</span>
                <span className="font-semibold text-green-600">{pts}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Activity */}
        {wallet?.ledger && wallet.ledger.length > 0 && (
          <Card className="p-5">
            <h3 className="font-bold text-gray-900 mb-3">Recent activity</h3>
            <ul className="space-y-1">
              {wallet.ledger.map((e, i) => (
                <li key={i} className="flex items-center justify-between text-sm rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-gray-700 truncate">{e.reason}</span>
                  <span className={`font-semibold tabular-nums ${e.delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {e.delta >= 0 ? "+" : ""}{e.delta}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {wallet && !wallet.identified && (
          <p className="text-center text-xs text-gray-400">
            Open inside Telegram (or sign in) to earn and track points.
          </p>
        )}
      </div>
    </div>
  );
}
