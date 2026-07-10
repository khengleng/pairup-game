import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTelegramInitData } from "@/lib/telegram";
import { Ticket, ChevronRight, Gift } from "lucide-react";

export default function ScratchList() {
  const [, setLocation] = useLocation();
  const initData = getTelegramInitData();

  const { data: campaigns, isLoading } = trpc.scratch.listCampaigns.useQuery();
  const { data: history } = trpc.scratch.myHistory.useQuery({ initData });

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Scratch &amp; Win</h1>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Back
          </Button>
        </div>

        {/* Campaigns */}
        {isLoading ? (
          <Card className="p-8 text-center text-gray-500">Loading games…</Card>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="space-y-3">
            {campaigns.map(c => (
              <Card
                key={c.id}
                className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation(`/scratch/${c.id}`)}
              >
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">{c.name}</p>
                  {c.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                  {c.expiresAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Ends {new Date(c.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center space-y-2">
            <Gift className="w-8 h-8 text-purple-400 mx-auto" />
            <p className="font-semibold text-gray-800">No live games right now</p>
            <p className="text-sm text-gray-500">
              Check back soon for the next scratch-card campaign.
            </p>
          </Card>
        )}

        {/* My prizes */}
        {history?.awards && history.awards.length > 0 && (
          <Card className="p-6 space-y-3">
            <h3 className="heading-md flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              My Prizes
            </h3>
            <ul className="space-y-2">
              {history.awards.map(a => (
                <li
                  key={a.claimRef}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-semibold text-gray-800">
                      {a.prizeLabel}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">
                      {a.campaignName} · {a.claimRef}
                    </span>
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      a.status === "fulfilled"
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {history && !history.identified && (
          <p className="text-center text-xs text-gray-400">
            Open inside Telegram (or sign in) to play for prizes and track your
            claims.
          </p>
        )}
      </div>
    </div>
  );
}
