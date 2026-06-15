import { useEffect } from "react";
import { useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl, POST_LOGIN_REDIRECT_KEY } from "@/const";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") {
      setLocation("/admin");
    }
  }, [setLocation, user]);

  const handleAdminLogin = () => {
    localStorage.setItem(POST_LOGIN_REDIRECT_KEY, "/admin");
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen pairup-gradient flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-green-400 text-white flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="heading-md">Admin Login</h1>
            <p className="text-sm text-gray-600 mt-2">
              Sign in with an authorized admin account to manage PairUp.
            </p>
          </div>
        </div>

        {user && user.role !== "admin" ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            This account is signed in, but it does not have admin access.
          </div>
        ) : null}

        <Button
          onClick={handleAdminLogin}
          disabled={loading}
          className="w-full btn-primary"
        >
          {loading ? "Checking session..." : "Sign In as Admin"}
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
