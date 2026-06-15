import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Lock, Power, PowerOff } from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: leads, isLoading } = trpc.lead.getAll.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const { data: themes, isLoading: isLoadingThemes } =
    trpc.gameConfig.getAllThemes.useQuery(undefined, {
      enabled: user?.role === "admin",
    });
  const createThemeMutation = trpc.gameConfig.createTheme.useMutation({
    onSuccess: async () => {
      await utils.gameConfig.getAllThemes.invalidate();
      await utils.gameConfig.getThemes.invalidate();
      setThemeName("");
      setThemeDescription("");
      setThemePairs("");
      toast.success("Theme added");
    },
    onError: error => {
      toast.error(error.message || "Failed to add theme");
    },
  });
  const setThemeEnabledMutation = trpc.gameConfig.setThemeEnabled.useMutation({
    onSuccess: async () => {
      await utils.gameConfig.getAllThemes.invalidate();
      await utils.gameConfig.getThemes.invalidate();
      toast.success("Theme updated");
    },
    onError: error => {
      toast.error(error.message || "Failed to update theme");
    },
  });
  const setThemeOrderMutation = trpc.gameConfig.setThemeOrder.useMutation({
    onSuccess: async () => {
      await utils.gameConfig.getAllThemes.invalidate();
      await utils.gameConfig.getThemes.invalidate();
      toast.success("Theme order updated");
    },
    onError: error => {
      toast.error(error.message || "Failed to update theme order");
    },
  });

  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [themePairs, setThemePairs] = useState("");

  const scoredLeads =
    leads?.filter(lead => typeof lead.score === "number") ?? [];
  const averageScore =
    scoredLeads.length > 0
      ? Math.round(
          scoredLeads.reduce((sum, lead) => sum + (lead.score ?? 0), 0) /
            scoredLeads.length
        )
      : null;
  const topScore =
    scoredLeads.length > 0
      ? Math.min(...scoredLeads.map(lead => lead.score ?? Infinity))
      : null;

  const parsedPairs = themePairs
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [term, ...definitionParts] = line.split("|");
      return {
        term: term?.trim() ?? "",
        definition: definitionParts.join("|").trim(),
      };
    })
    .filter(pair => pair.term && pair.definition);

  const handleCreateTheme = async (event: React.FormEvent) => {
    event.preventDefault();
    if (parsedPairs.length < 32) {
      toast.error(
        "Add at least 32 pairs. Use one `term | definition` pair per line."
      );
      return;
    }

    await createThemeMutation.mutateAsync({
      name: themeName,
      description: themeDescription,
      pairs: parsedPairs,
    });
  };

  const orderedThemes = themes ?? [];

  const handleMoveTheme = async (index: number, direction: -1 | 1) => {
    const theme = orderedThemes[index];
    const targetTheme = orderedThemes[index + direction];
    if (
      !theme ||
      !targetTheme ||
      theme.source !== "database" ||
      targetTheme.source !== "database" ||
      !theme.databaseId ||
      !targetTheme.databaseId
    ) {
      toast.error("Only admin-created themes can be arranged");
      return;
    }

    const currentOrder = theme.sortOrder ?? index;
    const targetOrder = targetTheme.sortOrder ?? index + direction;

    await Promise.all([
      setThemeOrderMutation.mutateAsync({
        themeId: theme.databaseId,
        sortOrder: targetOrder,
      }),
      setThemeOrderMutation.mutateAsync({
        themeId: targetTheme.databaseId,
        sortOrder: currentOrder,
      }),
    ]);
  };

  const handleToggleTheme = async (themeId: number, enabled: boolean) => {
    await setThemeEnabledMutation.mutateAsync({ themeId, enabled });
  };

  // Redirect if not admin
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-green-50">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="heading-md">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
          <Button
            onClick={() => setLocation("/")}
            className="btn-primary w-full"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-green-50">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="heading-md">Admin Login Required</h2>
          <p className="text-gray-600">
            Sign in with an authorized admin account to access this dashboard.
          </p>
          <Button
            onClick={() => setLocation("/admin/login")}
            className="btn-primary w-full"
          >
            Go to Admin Login
          </Button>
          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            className="w-full"
          >
            Back to Game
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PairUp Admin</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="btn-outline"
          >
            Back to Home
          </Button>
        </div>

        {/* Admin Title */}
        <div className="mb-8">
          <h2 className="heading-lg mb-2">📊 Lead Management</h2>
          <p className="text-gray-600">
            View all captured leads from PairUp players
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="heading-md">Game Themes</h3>
                <p className="text-sm text-gray-600">
                  Configured themes available to players
                </p>
              </div>
              <span className="text-sm font-semibold text-purple-600">
                {themes?.length ?? 0}
              </span>
            </div>

            {isLoadingThemes ? (
              <p className="text-sm text-gray-600">Loading themes...</p>
            ) : orderedThemes.length > 0 ? (
              <div className="space-y-3">
                {orderedThemes.map((theme, index) => {
                  const canManage =
                    theme.source === "database" && Boolean(theme.databaseId);
                  const canMoveUp =
                    canManage &&
                    orderedThemes[index - 1]?.source === "database";
                  const canMoveDown =
                    canManage &&
                    orderedThemes[index + 1]?.source === "database";

                  return (
                    <div
                      key={`${theme.source}-${theme.id}`}
                      className="border border-gray-200 rounded-lg p-4 bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {theme.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {theme.description}
                          </p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-50 text-purple-700">
                          {theme.source}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>{theme.pairs.length} card pairs</span>
                          <span
                            className={`font-semibold px-2 py-1 rounded-full ${
                              theme.enabled
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {theme.enabled ? "Active" : "Hidden"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={
                              !canMoveUp || setThemeOrderMutation.isPending
                            }
                            onClick={() => handleMoveTheme(index, -1)}
                            title="Move up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={
                              !canMoveDown || setThemeOrderMutation.isPending
                            }
                            onClick={() => handleMoveTheme(index, 1)}
                            title="Move down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          {canManage && theme.databaseId ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled={setThemeEnabledMutation.isPending}
                              onClick={() =>
                                handleToggleTheme(
                                  theme.databaseId!,
                                  !theme.enabled
                                )
                              }
                              title={
                                theme.enabled ? "Hide theme" : "Enable theme"
                              }
                            >
                              {theme.enabled ? (
                                <PowerOff className="w-4 h-4" />
                              ) : (
                                <Power className="w-4 h-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled
                              title="Bundled theme"
                            >
                              <Lock className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No themes configured yet</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-4">
              <h3 className="heading-md">Add Theme</h3>
              <p className="text-sm text-gray-600">
                Enter one card pair per line using the format term | definition
              </p>
            </div>

            <form onSubmit={handleCreateTheme} className="space-y-4">
              <div>
                <Label htmlFor="themeName">Theme Name</Label>
                <Input
                  id="themeName"
                  value={themeName}
                  onChange={event => setThemeName(event.target.value)}
                  placeholder="Partners"
                  required
                />
              </div>

              <div>
                <Label htmlFor="themeDescription">Description</Label>
                <Input
                  id="themeDescription"
                  value={themeDescription}
                  onChange={event => setThemeDescription(event.target.value)}
                  placeholder="Match partners with their capabilities"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="themePairs">Card Pairs</Label>
                  <span className="text-xs text-gray-500">
                    {parsedPairs.length}/32 minimum
                  </span>
                </div>
                <Textarea
                  id="themePairs"
                  value={themePairs}
                  onChange={event => setThemePairs(event.target.value)}
                  rows={10}
                  placeholder={
                    "CloudSync | Real-time data synchronization\nDataVault | Secure encrypted storage"
                  }
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={createThemeMutation.isPending}
                className="w-full btn-primary"
              >
                {createThemeMutation.isPending ? "Adding..." : "Add Theme"}
              </Button>
            </form>
          </Card>
        </div>

        {/* Leads Table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading leads...</p>
            </div>
          ) : leads && leads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-50 to-green-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Company
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Score
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Theme
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Difficulty
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, idx) => (
                    <tr
                      key={lead.id}
                      className={`border-b border-gray-200 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-purple-50`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {lead.name}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{lead.email}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {lead.company}
                      </td>
                      <td className="px-6 py-4">
                        {lead.score ? (
                          <span className="inline-block px-3 py-1 bg-gradient-to-r from-purple-100 to-green-100 text-purple-700 rounded-full font-bold text-sm">
                            {lead.score}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {lead.theme || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {lead.gridSize || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-600">No leads captured yet</p>
            </div>
          )}
        </Card>

        {/* Stats */}
        {leads && leads.length > 0 && (
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Card className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Total Leads</p>
              <p className="text-4xl font-bold text-purple-600">
                {leads.length}
              </p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Avg. Score</p>
              <p className="text-4xl font-bold text-green-600">
                {averageScore ?? "-"}
              </p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Top Score</p>
              <p className="text-4xl font-bold text-purple-600">
                {topScore ?? "-"}
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
