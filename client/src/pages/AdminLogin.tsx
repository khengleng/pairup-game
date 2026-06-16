import { useEffect } from "react";
import { useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getAuthConfigStatus,
  getLoginUrl,
  POST_LOGIN_REDIRECT_KEY,
} from "@/const";
import { toast } from "sonner";

export default function AdminLogin() {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const isSetupLogin = location === "/setup";
  const authConfig = getAuthConfigStatus();

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") {
      setLocation("/admin");
    }
  }, [setLocation, user]);

  const handleAdminLogin = () => {
    try {
      localStorage.setItem(POST_LOGIN_REDIRECT_KEY, "/admin");
      window.location.href = getLoginUrl();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "OAuth is not configured correctly"
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
              Sign in with an authorized admin account to add themes, arrange
              games, and manage PairUp.
            </p>
          </div>
        </div>

        {user && user.role !== "admin" ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            This account is signed in, but it does not have admin access.
          </div>
        ) : null}

        {!authConfig.isConfigured ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            OAuth is not configured yet. Set a real{" "}
            <span className="font-semibold">VITE_APP_ID</span> in Railway before
            signing in.
          </div>
        ) : null}

        <Button
          onClick={handleAdminLogin}
          disabled={loading || !authConfig.isConfigured}
          className="w-full btn-primary"
        >
          {loading ? "Checking session..." : "Sign In to Setup Games"}
        </Button>

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
