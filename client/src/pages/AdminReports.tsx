import { trpc } from "@/lib/trpc";
import AdminPage from "@/components/AdminPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

type Row = {
  id: number;
  name: string;
  gameType: string;
  status: string;
  plays: number;
  winners: number;
  winRate: number;
  fulfilled: number;
  redemptionRate: number;
  maxExposureCents: number;
  awardedValueCents: number;
};

function toCsv(rows: Row[]): string {
  const header = [
    "Campaign", "Game type", "Status", "Plays", "Winners", "Win rate",
    "Fulfilled", "Redemption rate", "Max exposure", "Awarded value",
  ];
  const lines = rows.map(r => [
    `"${r.name.replace(/"/g, '""')}"`,
    r.gameType, r.status, r.plays, r.winners, pct(r.winRate),
    r.fulfilled, pct(r.redemptionRate),
    (r.maxExposureCents / 100).toFixed(2), (r.awardedValueCents / 100).toFixed(2),
  ].join(","));
  return [header.join(","), ...lines].join("\n");
}

export default function AdminReports() {
  const { data: reports } = trpc.scratch.adminReports.useQuery();

  const download = () => {
    if (!reports) return;
    const blob = new Blob([toCsv(reports as Row[])], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scratch-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = (reports ?? []).reduce(
    (acc, r) => {
      acc.plays += r.plays;
      acc.winners += r.winners;
      acc.exposure += r.maxExposureCents;
      acc.awarded += r.awardedValueCents;
      return acc;
    },
    { plays: 0, winners: 0, exposure: 0, awarded: 0 }
  );

  return (
    <AdminPage active="reports">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Total plays", totals.plays.toLocaleString()],
            ["Total winners", totals.winners.toLocaleString()],
            ["Max exposure", money(totals.exposure)],
            ["Awarded value", money(totals.awarded)],
          ].map(([label, val]) => (
            <Card key={label} className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{val}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="heading-md">Campaign performance</h3>
            <Button onClick={download} disabled={!reports || reports.length === 0}
              className="flex items-center gap-2" variant="outline" size="sm">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Campaign</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Plays</th>
                  <th className="py-2 pr-4 text-right">Winners</th>
                  <th className="py-2 pr-4 text-right">Win rate</th>
                  <th className="py-2 pr-4 text-right">Redemption</th>
                  <th className="py-2 pr-4 text-right">Exposure</th>
                  <th className="py-2 pr-4 text-right">Awarded</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {(reports ?? []).map(r => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium">{r.name}</td>
                    <td className="py-2 pr-4 text-gray-500">{r.status}</td>
                    <td className="py-2 pr-4 text-right">{r.plays}</td>
                    <td className="py-2 pr-4 text-right">{r.winners}</td>
                    <td className="py-2 pr-4 text-right">{pct(r.winRate)}</td>
                    <td className="py-2 pr-4 text-right">{pct(r.redemptionRate)}</td>
                    <td className="py-2 pr-4 text-right">{money(r.maxExposureCents)}</td>
                    <td className="py-2 pr-4 text-right">{money(r.awardedValueCents)}</td>
                  </tr>
                ))}
                {reports && reports.length === 0 && (
                  <tr><td colSpan={8} className="py-4 text-center text-gray-500">No campaigns yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminPage>
  );
}
