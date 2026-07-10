import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isScratchAdminHost } from "@/lib/host";
import { toast } from "sonner";

export default function AdminLogin() {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const isSetupLogin = location === "/setup";
  const [password, setPassword] = useState("");

  // On the scratch-admin domain, land admins straight in the scratch portal.
  const postLoginPath = isScratchAdminHost() ? "/admin/scratch" : "/admin";

  const loginMutation = trpc.auth.adminLogin.useMutation();

  useEffect(() => {
    if (user?.role === "admin") {
      setLocation(postLoginPath);
    }
  }, [setLocation, user, postLoginPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Enter the admin password");
      return;
    }
    try {
      await loginMutation.mutateAsync({ password });
      // Refresh auth state so the context picks up the admin session cookie.
      await utils.auth.me.invalidate();
      toast.success("Signed in");
      setLocation(postLoginPath);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Sign in failed"
      );
    }
  };

  return (
    <div className="min-h-screen pairup-gradient flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-green-400 text-white flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="heading-md">
              {isSetupLogin ? "Game Setup Login" : "Admin Login"}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Enter the admin password to add themes, arrange games, and manage
              PairUp.
            </p>
          </div>
        </div>

        {user && user.role !== "admin" ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            This account is signed in, but it does not have admin access.
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="password">Admin Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading || loginMutation.isPending || !password}
            className="w-full btn-primary"
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          onClick={() => setLocation("/")}
          className="w-full"
        >
          Back to Game
        </Button>
      </Card>
    </div>
  );
}
