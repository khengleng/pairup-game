import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminPage from "@/components/AdminPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function AdminSecurity() {
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.adminMe.useQuery();
  const [enroll, setEnroll] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");

  const setup = trpc.auth.mfaSetup.useMutation({
    onSuccess: d => setEnroll(d),
    onError: e => toast.error(e.message),
  });
  const enable = trpc.auth.mfaEnable.useMutation({
    onSuccess: async () => {
      await utils.auth.adminMe.invalidate();
      setEnroll(null);
      setCode("");
      toast.success("2FA is now on");
    },
    onError: e => toast.error(e.message),
  });
  const disable = trpc.auth.mfaDisable.useMutation({
    onSuccess: async () => {
      await utils.auth.adminMe.invalidate();
      toast.success("2FA disabled");
    },
    onError: e => toast.error(e.message),
  });

  const copy = (t: string) =>
    navigator.clipboard?.writeText(t).then(() => toast.success("Copied"));

  return (
    <AdminPage active="security">
      <Card className="p-6 max-w-xl">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-purple-600" />
          <h3 className="heading-md">Two-factor authentication</h3>
        </div>

        {me && !me.canEnrollMfa ? (
          <p className="text-sm text-gray-600 mt-2">
            You're signed in with the master password. Its 2FA is configured via the
            <code className="mx-1">ADMIN_TOTP_SECRET</code> environment variable. Create a
            personal admin account (Team) to self-manage 2FA.
          </p>
        ) : me?.mfaEnabled ? (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-green-700 font-semibold">✅ 2FA is on for your account.</p>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
              disabled={disable.isPending}
              onClick={() => {
                if (window.confirm("Disable 2FA for your account?")) disable.mutate();
              }}>
              Disable 2FA
            </Button>
          </div>
        ) : enroll ? (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-gray-600">
              Scan this QR code with Google Authenticator (or Authy), then enter the
              6-digit code to confirm.
            </p>
            <div className="flex justify-center">
              <div className="rounded-xl bg-white p-4 border border-gray-200 shadow-sm">
                <QRCodeSVG value={enroll.otpauthUri} size={192} level="M" includeMargin={false} />
              </div>
            </div>
            <div>
              <Label>Can't scan? Enter this key manually</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all">
                  {enroll.secret}
                </code>
                <button onClick={() => copy(enroll.secret)} aria-label="Copy" className="text-purple-600">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <Label>Or add via link</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all">
                  {enroll.otpauthUri}
                </code>
                <button onClick={() => copy(enroll.otpauthUri)} aria-label="Copy link" className="text-purple-600">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <Label>6-digit code</Label>
              <Input inputMode="numeric" maxLength={6} value={code}
                onChange={e => setCode(e.target.value)} placeholder="123456" />
            </div>
            <div className="flex gap-2">
              <Button disabled={enable.isPending || code.length !== 6}
                onClick={() => enable.mutate({ code })} className="btn-primary">
                {enable.isPending ? "Confirming…" : "Enable 2FA"}
              </Button>
              <Button variant="outline" onClick={() => setEnroll(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-gray-600">
              Protect your admin account with a time-based one-time code from an authenticator app.
            </p>
            <Button disabled={setup.isPending} onClick={() => setup.mutate()} className="btn-primary">
              {setup.isPending ? "…" : "Set up 2FA"}
            </Button>
          </div>
        )}
      </Card>
    </AdminPage>
  );
}
