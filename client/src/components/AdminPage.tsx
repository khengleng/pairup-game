import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import AdminNav from "@/components/AdminNav";

type AdminSection =
  | "overview" | "scratch" | "claims" | "fraud" | "reports" | "team" | "approvals";

/** Auth-guarded admin layout with the shared nav. */
export default function AdminPage({
  active,
  children,
}: {
  active: AdminSection;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (!loading && !user) return <Redirect to="/admin/login" />;
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center pairup-gradient">
        <Card className="p-8 max-w-md text-center">
          <h2 className="heading-md">Access Denied</h2>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pairup-gradient py-8">
      <div className="container max-w-5xl">
        <AdminNav active={active} />
        {children}
      </div>
    </div>
  );
}
