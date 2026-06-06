import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TRPCError } from "@trpc/server";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: leads, isLoading } = trpc.lead.getAll.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  // Redirect if not admin
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-green-50">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="heading-md">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <Button onClick={() => setLocation("/")} className="btn-primary w-full">
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
          <h2 className="heading-md">Please Sign In</h2>
          <p className="text-gray-600">You need to be logged in to access the admin dashboard.</p>
          <Button onClick={() => setLocation("/")} className="btn-primary w-full">
            Back to Home
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
          <p className="text-gray-600">View all captured leads from PairUp players</p>
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Company</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Score</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Theme</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Difficulty</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
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
                        <p className="font-semibold text-gray-900">{lead.name}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{lead.email}</td>
                      <td className="px-6 py-4 text-gray-600">{lead.company}</td>
                      <td className="px-6 py-4">
                        {lead.score ? (
                          <span className="inline-block px-3 py-1 bg-gradient-to-r from-purple-100 to-green-100 text-purple-700 rounded-full font-bold text-sm">
                            {lead.score}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{lead.theme || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{lead.gridSize || "-"}</td>
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
              <p className="text-4xl font-bold text-purple-600">{leads.length}</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Avg. Score</p>
              <p className="text-4xl font-bold text-green-600">
                {Math.round(
                  leads.reduce((sum, lead) => sum + (lead.score || 0), 0) / leads.filter((l) => l.score).length
                )}
              </p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Top Score</p>
              <p className="text-4xl font-bold text-purple-600">
                {Math.min(...leads.filter((l) => l.score).map((l) => l.score || Infinity))}
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
